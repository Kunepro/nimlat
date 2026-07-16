/*
 * AniListRateLimiter
 * --------------------
 * Singleton service responsible for managing all outbound requests to AniList.
 *
 * Responsibilities:
 * - Enforces AniList's global rate limiting at our conservative 60 requests/minute ceiling
 * - Prevents 429 errors by serializing all outgoing requests with intelligent throttling
 * - Handles burst protection by spacing requests appropriately (min delay + backoff when needed)
 * - Reads response headers (X-RateLimit-Remaining, Retry-After) to adjust queue behavior
 * - Retries failed requests on 429, respecting Retry-After
 * - Supports prioritization (manual > series hydration > media data > background)
 * - Publishes BUS events when the queue is paused due to rate limiting
 * - Pauses queue when network is offline, resumes when online
 *
 * Control flow (high level):
 * 1) enqueue() pushes a request into the matching priority lane and triggers processQueue().
 * 2) processQueue() exits early if paused/offline/processing; otherwise dequeues next request.
 * 3) Success: resolve, reset rate-limit streak, wait minSpacingMs, then process next.
 * 4) 429: requeue at front, compute delay = max(Retry-After, exponential backoff), pause queue.
 * 5) Other error: log to file, reject caller, continue processing.
 */

import {
	ActionsNetwork,
	BUS_AniListQueuePaused,
	BUS_Network,
} from "@nimlat/busses/main";
import { HTTP_STATUS } from "@nimlat/constants/http-status";
import { debug } from "@nimlat/database";
import type { ErrorWithResponse } from "@nimlat/functions";
import {
	isErrorWithResponse,
	ofType,
	typeSafeError,
} from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	type Subscription,
	timer,
} from "rxjs";
import { resolveAniListRateLimitDelaySeconds } from "./ani-list-rate-limit-policy";
import {
	type AniListRateLimiterPriority,
	AniListRateLimiterQueue,
	type AniListRateLimiterRequestContext,
	type QueuedAniListRequest,
} from "./ani-list-rate-limiter-queue";

export type {
	AniListRateLimiterPriority,
	AniListRateLimiterRequestContext,
} from "./ani-list-rate-limiter-queue";

type AniListRateLimiterTimer = "retry-after" | "next-processing";

class AniListRateLimiter {
	private static instance: AniListRateLimiter;
	private readonly queue                                  = new AniListRateLimiterQueue();
	private readonly scheduledTimers                        = new Map<AniListRateLimiterTimer, Subscription>();
	private isProcessing                      = false;
	private isPaused                          = false;
	private online                            = true;
	private networkChangesSubscription: Subscription | null = null;
	private readonly minSpacingMs             = 1_000;
	private readonly defaultRetryAfterSeconds = 5;
	private readonly maxBackoffSeconds        = 60;
	private consecutiveRateLimitCount         = 0;

	private constructor() {
		this.subscribeToNetworkChanges();
	}

	public static getInstance(): AniListRateLimiter {
		if (!AniListRateLimiter.instance) {
			AniListRateLimiter.instance = new AniListRateLimiter();
		}
		return AniListRateLimiter.instance;
	}

	public enqueue<T>(
		execute: () => Promise<T>,
		priority: AniListRateLimiterPriority,
		context: AniListRateLimiterRequestContext = { operation: "unknown" },
	): Promise<T> {
		return new Promise((resolve, reject) => {
			const req: QueuedAniListRequest<unknown> = {
				execute: () => execute() as Promise<unknown>,
				resolve: (val) => resolve(val as T),
				reject,
				priority,
				context,
				enqueuedAt: Date.now(),
			};
			this.queue.enqueue(req);
			this.debugLog(
				"Request enqueued.",
				{
					priority,
					...this.queue.getSnapshot(),
				},
			);
			this.processQueue();
		});
	}

	// Mirrors the Network bus into the limiter so queued AniList work pauses cleanly

	// controlled shutdown paths must be able to release timers and BUS listeners.
	public dispose(): void {
		this.networkChangesSubscription?.unsubscribe();
		this.networkChangesSubscription = null;
		this.cancelScheduledTimers();
	}

	// The exported singleton lives for the app process, but tests and future

	// while offline and resumes without callers needing their own retry loops.
	private subscribeToNetworkChanges(): void {
		this.networkChangesSubscription = BUS_Network
			.pipe(ofType(ActionsNetwork.connectionChanged))
			.subscribe((a) => {
				this.setOnlineStatus(a.isOnline);
			});
	}

	private setOnlineStatus(isOnline: boolean): void {
		this.online = isOnline;
		this.debugLog(
			isOnline ? "Network online, resuming queue." : "Network offline, pausing queue.",
		);
		if (isOnline && !this.isPaused) {
			this.processQueue();
		}
	}

	// Core queue loop: pick the highest non-empty lane, run one request, then either

	// apply spacing/backoff or propagate non-rate-limit failures to the caller.
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.isPaused || !this.online) return;
		const next = this.queue.dequeueNext();
		if (!next) return;

		this.isProcessing = true;
		try {
			const result = await next.execute();
			this.handleSuccess(
				next,
				result,
			);
		} catch (err: unknown) {
			if (this.isRateLimitError(err)) {
				this.handleRateLimit(
					next,
					err,
				);
			} else {
				this.handleFailure(
					next,
					err,
				);
			}
		}
	}

	private handleSuccess<T>(request: QueuedAniListRequest<T>, result: T): void {
		request.resolve(result);
		this.consecutiveRateLimitCount = 0;
		this.debugLog(
			"Request succeeded.",
			this.queue.getSnapshot(),
		);
		// Delay to respect minimum spacing between requests.
		this.scheduleNextProcessing(this.minSpacingMs);
	}

	private handleRateLimit(request: QueuedAniListRequest, error: ErrorWithResponse): void {
		this.consecutiveRateLimitCount += 1;
		const delaySeconds = resolveAniListRateLimitDelaySeconds({
			error,
			consecutiveRateLimitCount: this.consecutiveRateLimitCount,
			defaultRetryAfterSeconds:  this.defaultRetryAfterSeconds,
			maxBackoffSeconds:         this.maxBackoffSeconds,
		});
		// Requeue the request at the front before pausing.
		this.queue.requeueFront(request);
		this.isProcessing = false;
		this.pauseQueue(delaySeconds);
	}

	private handleFailure(request: QueuedAniListRequest, error: unknown): void {
		const safeError                = typeSafeError(error);
		this.consecutiveRateLimitCount = 0;
		const snapshot = this.queue.getSnapshot();
		LoggerUtils.logAniListRateLimiterError(
			safeError,
			{
				message:                  "AniList request failed.",
				priority:                 request.priority,
				queueSizeManual:          snapshot.queueManual,
				queueSizeSeriesHydration: snapshot.queueSeriesHydration,
				queueSizeMediaData:       snapshot.queueMediaData,
				queueSizeBackground:      snapshot.queueBackground,
				requestAgeMs:             Date.now() - request.enqueuedAt,
				...request.context,
			},
		);
		this.debugLog(
			"AniList request failed.",
			{
				error:    safeError,
				priority: request.priority,
				...snapshot,
			},
		);
		request.reject(safeError);
		this.isProcessing = false;
		void this.processQueue();
	}

	private pauseQueue(seconds: number) {
		this.isPaused = true;
		this.emitRateLimitPause(seconds);
		this.debugLog(
			"Queue paused due to rate limiting.",
			{
				retryAfterSeconds: seconds,
				backoffCount:      this.consecutiveRateLimitCount,
				...this.queue.getSnapshot(),
			},
		);
		this.scheduleTimer(
			"retry-after",
			seconds * 1000,
			() => {
				this.isPaused = false;
				this.debugLog(
					"Rate limit pause ended, resuming queue.",
					this.queue.getSnapshot(),
				);
				this.processQueue();
			},
		);
	}

	private emitRateLimitPause(seconds: number) {
		// Rate-limit notifications are renderer-only; queue timing is owned here.
		BUS_AniListQueuePaused.next(seconds);
	}

	private scheduleNextProcessing(delayMs: number): void {
		this.scheduleTimer(
			"next-processing",
			delayMs,
			() => {
				this.isProcessing = false;
				this.processQueue();
			},
		);
	}

	// Limiter timers are named subscriptions so every delayed transition has one
	// owner and dispose can cancel all future queue movement in a single place.
	private scheduleTimer(
		name: AniListRateLimiterTimer,
		delayMs: number,
		run: () => void,
	): void {
		this.cancelScheduledTimer(name);
		const subscription = timer(delayMs).subscribe(() => {
			this.scheduledTimers.delete(name);
			run();
		});
		this.scheduledTimers.set(
			name,
			subscription,
		);
	}

	private cancelScheduledTimer(name: AniListRateLimiterTimer): void {
		this.scheduledTimers.get(name)?.unsubscribe();
		this.scheduledTimers.delete(name);
	}

	private cancelScheduledTimers(): void {
		for (const timerName of Array.from(this.scheduledTimers.keys())) {
			this.cancelScheduledTimer(timerName);
		}
	}

	private isRateLimitError(error: unknown): error is ErrorWithResponse {
		if (!isErrorWithResponse(error)) return false;
		return error.response?.status === HTTP_STATUS.TOO_MANY_REQUESTS;
	}

	private debugLog(message: string, details?: Record<string, unknown>): void {
		if (!debug()) return;
		LoggerUtils.logMainInfo(
			"ani-list.rate-limiter.debug",
			message,
			details,
		);
	}

}

export const aniListRateLimiter = AniListRateLimiter.getInstance();
