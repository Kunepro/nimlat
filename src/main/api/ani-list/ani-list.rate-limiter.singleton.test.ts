// @vitest-environment node
import type { ErrorWithResponse } from "@nimlat/functions";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	aniListQueuePausedNext:    vi.fn(),
	networkChangeSubscribers:  [] as Array<(action: { isOnline: boolean; type: string }) => void>,
	unsubscribeNetworkChanges: vi.fn(),
}));

vi.mock(
	"@nimlat/busses/main",
	() => ({
		ActionsNetwork: {
			connectionChanged: "connectionChanged",
		},
		BUS_AniListQueuePaused: {
			next: mocks.aniListQueuePausedNext,
		},
		BUS_Network:    {
			pipe: () => ({
				subscribe: (subscriber: (action: { isOnline: boolean; type: string }) => void) => {
					mocks.networkChangeSubscribers.push(subscriber);
					return { unsubscribe: mocks.unsubscribeNetworkChanges };
				},
			}),
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		debug: () => false,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logAniListRateLimiterError: vi.fn(),
			logMainInfo:                vi.fn(),
		},
	}),
);

vi.mock(
	"electron",
	() => ({
		webContents: {
			getAllWebContents: () => [],
		},
	}),
);

type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
};

/*
 * Small deferred helper so the test can hold one AniList request in flight while
 * asserting which queued request the limiter schedules next.
 */
function createDeferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject  = rej;
	});

	return {
		promise,
		resolve,
		reject,
	};
}

function rateLimitError(retryAfterSeconds: number): ErrorWithResponse {
	return Object.assign(
		new Error("rate limited"),
		{
			response: {
				headers: { "retry-after": String(retryAfterSeconds) },
				status:  429,
			},
		},
	);
}

function emitNetworkChange(isOnline: boolean): void {
	const subscriber = mocks.networkChangeSubscribers.at(-1);
	if (!subscriber) {
		throw new Error("AniList rate limiter did not subscribe to network changes.");
	}
	subscriber({
		isOnline,
		type: "connectionChanged",
	});
}

describe(
	"aniListRateLimiter",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.useFakeTimers();
			mocks.aniListQueuePausedNext.mockClear();
			mocks.networkChangeSubscribers.length = 0;
			mocks.unsubscribeNetworkChanges.mockClear();
		});

		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
		});

		it(
			"runs manual requests ahead of series hydration, media data, and background work without preempting the active request",
			async () => {
				const { aniListRateLimiter } = await import("./ani-list.rate-limiter.singleton");
				const started: string[]      = [];
				const activeRequest          = createDeferred<string>();

				const firstRequest        = aniListRateLimiter.enqueue(
					() => {
						started.push("active-ingestion");
						return activeRequest.promise;
					},
					"series-hydration",
				);
				const backgroundHydration = aniListRateLimiter.enqueue(
					async () => {
						started.push("queued-background");
						return "background";
					},
					"background",
				);
				const mediaDataHydration  = aniListRateLimiter.enqueue(
					async () => {
						started.push("queued-media-data");
						return "media-data";
					},
					"media-data",
				);
				const seriesHydration     = aniListRateLimiter.enqueue(
					async () => {
						started.push("queued-series");
						return "series";
					},
					"series-hydration",
				);
				const manualRequest       = aniListRateLimiter.enqueue(
					async () => {
						started.push("queued-manual");
						return "manual";
					},
					"manual",
				);

				await Promise.resolve();
				expect(started).toEqual([ "active-ingestion" ]);

				activeRequest.resolve("active");
				await expect(firstRequest).resolves.toBe("active");

				await vi.advanceTimersByTimeAsync(1_000);

				await expect(manualRequest).resolves.toBe("manual");
				await vi.advanceTimersByTimeAsync(1_000);
				await expect(seriesHydration).resolves.toBe("series");
				await vi.advanceTimersByTimeAsync(1_000);
				await expect(mediaDataHydration).resolves.toBe("media-data");
				await vi.advanceTimersByTimeAsync(1_000);
				await expect(backgroundHydration).resolves.toBe("background");
				expect(started).toEqual([
					"active-ingestion",
					"queued-manual",
					"queued-series",
					"queued-media-data",
					"queued-background",
				]);
			},
		);

		it(
			"pauses queued work while offline and resumes from the network BUS event",
			async () => {
				const { aniListRateLimiter } = await import("./ani-list.rate-limiter.singleton");
				const started: string[]      = [];

				emitNetworkChange(false);
				const request = aniListRateLimiter.enqueue(
					async () => {
						started.push("manual");
						return "ok";
					},
					"manual",
				);

				await vi.advanceTimersByTimeAsync(0);
				expect(started).toEqual([]);

				emitNetworkChange(true);

				await expect(request).resolves.toBe("ok");
				expect(started).toEqual([ "manual" ]);

				aniListRateLimiter.dispose();
			},
		);

		it(
			"keeps rate-limited work at the front of its lane until the retry timer resumes the queue",
			async () => {
				const { aniListRateLimiter } = await import("./ani-list.rate-limiter.singleton");
				const started: string[]      = [];
				let attempts                 = 0;

				const rateLimitedRequest = aniListRateLimiter.enqueue(
					async () => {
						attempts += 1;
						started.push(`rate-limited-${ attempts }`);
						if (attempts === 1) {
							throw rateLimitError(8);
						}
						return "retried";
					},
					"manual",
				);
				const laterManualRequest = aniListRateLimiter.enqueue(
					async () => {
						started.push("later-manual");
						return "later";
					},
					"manual",
				);

				await vi.advanceTimersByTimeAsync(0);
				expect(mocks.aniListQueuePausedNext).toHaveBeenCalledWith(8);
				expect(started).toEqual([ "rate-limited-1" ]);

				await vi.advanceTimersByTimeAsync(7_999);
				expect(started).toEqual([ "rate-limited-1" ]);

				await vi.advanceTimersByTimeAsync(1);

				await expect(rateLimitedRequest).resolves.toBe("retried");
				expect(started).toEqual([
					"rate-limited-1",
					"rate-limited-2",
				]);

				await vi.advanceTimersByTimeAsync(1_000);

				await expect(laterManualRequest).resolves.toBe("later");
				expect(started).toEqual([
					"rate-limited-1",
					"rate-limited-2",
					"later-manual",
				]);
			},
		);

		it(
			"cancels the pending rate-limit resume timer on dispose",
			async () => {
				const { aniListRateLimiter } = await import("./ani-list.rate-limiter.singleton");
				let attempts                 = 0;

				void aniListRateLimiter.enqueue(
					async () => {
						attempts += 1;
						throw rateLimitError(8);
					},
					"manual",
				);

				await vi.advanceTimersByTimeAsync(0);

				expect(attempts).toBe(1);
				expect(vi.getTimerCount()).toBe(1);

				aniListRateLimiter.dispose();

				expect(vi.getTimerCount()).toBe(0);

				await vi.advanceTimersByTimeAsync(60_000);

				expect(attempts).toBe(1);
			},
		);

		it(
			"releases the network subscription and pending queue timer on dispose",
			async () => {
				const { aniListRateLimiter } = await import("./ani-list.rate-limiter.singleton");

				const request = aniListRateLimiter.enqueue(
					async () => "ok",
					"manual",
				);

				await expect(request).resolves.toBe("ok");
				expect(vi.getTimerCount()).toBe(1);

				aniListRateLimiter.dispose();

				expect(mocks.unsubscribeNetworkChanges).toHaveBeenCalledTimes(1);
				expect(vi.getTimerCount()).toBe(0);
			},
		);
	},
);
