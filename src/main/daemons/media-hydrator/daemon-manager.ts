import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import {
	interval,
	merge,
	Subscription,
	timer,
} from "rxjs";
import { processMediaCharactersQueue } from "./daemons/group-characters-daemon";
import { processJikanEpisodeThumbnailsQueue } from "./daemons/group-jikan-episode-thumbnails-daemon";
import { processJikanEpisodesQueue } from "./daemons/group-jikan-episodes-daemon";
import { processMediaStaffQueue } from "./daemons/group-staff-daemon";

const HYDRATION_RETRY_INTERVAL_MS = 60_000;

type HydrationRetryQueue =
	| "jikan-episodes"
	| "jikan-episode-thumbnails";

// Coordinates only secondary provider enrichment after canonical media ingestion:
// AniList characters/staff plus Jikan episodes/thumbnails. Full media payloads are
// persisted by scanner/updater/refresh callers before these queues are populated.
// The manager owns every timer/subscription so Electron rebuilds can stop all
// schedulers before SQLite closes.
export class DaemonManager {
	private isCheckingQueues                     = false;
	private isDisposed                           = false;
	private readonly subscriptions               = new Subscription();
	private readonly retryQueueWakeSubscriptions = new Map<HydrationRetryQueue, Subscription>();

	constructor() {
		this.registerQueueSweepTriggers();

		// Consume rows already present at startup instead of waiting for the next
		// queue-change event or recovery interval.
		this.checkQueuesAndProcess();
	}

	public dispose(): void {
		this.isDisposed = true;
		this.subscriptions.unsubscribe();
		this.retryQueueWakeSubscriptions.clear();
	}

	// Coalesce recursive queue-change signals while one sweep is selecting work.
	// Each daemon has its own in-flight guard, so this method only coordinates wakeups.
	public checkQueuesAndProcess() {
		if (this.isDisposed || this.isCheckingQueues) {
			return;
		}

		this.isCheckingQueues = true;
		try {
			// Queue mutations publish renderer refresh events. The guard keeps
			// those events from recursively starting another scheduler pass.
			this.checkAndProcessGroupCharactersQueue();
			this.checkAndProcessGroupStaffQueue();
			this.checkAndProcessGroupJikanEpisodesQueue();
			this.checkAndProcessJikanEpisodeThumbnailsQueue();
		} finally {
			this.isCheckingQueues = false;
		}
	}

	private registerQueueSweepTriggers(): void {
		// Queue changes and periodic recovery ticks are both scheduler signals.
		// Keeping them in one subscription root makes app shutdown deterministic.
		this.subscriptions.add(
			merge(
				BUS_HydratorQueueChanges,
				interval(HYDRATION_RETRY_INTERVAL_MS),
			).subscribe(() => {
				this.checkQueuesAndProcess();
			}),
		);
	}

	// Character and staff queues have no cooldown state: any ready row can wake its daemon.
	private checkAndProcessGroupCharactersQueue() {
		if (this.isDisposed) {
			return;
		}

		const count = AnimeDbFacade.getGroupCharactersQueueCount();
		if (count > 0) {
			processMediaCharactersQueue();
		}
	}

	private checkAndProcessGroupStaffQueue() {
		if (this.isDisposed) {
			return;
		}

		const count = AnimeDbFacade.getStaffQueueCount();
		if (count > 0) {
			processMediaStaffQueue();
		}
	}

	// Jikan queues may contain retryable rows that are temporarily hidden by
	// cooldown, so an empty ready count can still require a future wakeup.
	private checkAndProcessGroupJikanEpisodesQueue() {
		if (this.isDisposed) {
			return;
		}

		const count = AnimeDbFacade.getGroupJikanEpisodesQueueCount();
		if (count > 0) {
			processJikanEpisodesQueue();
			this.clearScheduledRetryWake("jikan-episodes");
			return;
		}

		this.scheduleRetryWake(
			"jikan-episodes",
			() => AnimeDbFacade.getNextGroupJikanEpisodesRetryAt(),
			() => this.checkAndProcessGroupJikanEpisodesQueue(),
		);
	}

	private checkAndProcessJikanEpisodeThumbnailsQueue() {
		if (this.isDisposed) {
			return;
		}

		const count = AnimeDbFacade.getJikanEpisodeThumbnailsQueueCount();
		if (count > 0) {
			processJikanEpisodeThumbnailsQueue();
			this.clearScheduledRetryWake("jikan-episode-thumbnails");
			return;
		}

		this.scheduleRetryWake(
			"jikan-episode-thumbnails",
			() => AnimeDbFacade.getNextJikanEpisodeThumbnailsRetryAt(),
			() => this.checkAndProcessJikanEpisodeThumbnailsQueue(),
		);
	}

	private clearScheduledRetryWake(queue: HydrationRetryQueue): void {
		const retrySubscription = this.retryQueueWakeSubscriptions.get(queue);
		if (!retrySubscription) {
			return;
		}

		this.subscriptions.remove(retrySubscription);
		retrySubscription.unsubscribe();
		this.retryQueueWakeSubscriptions.delete(queue);
	}

	private scheduleRetryWake(
		queue: HydrationRetryQueue,
		readRetryAt: () => number | null,
		processQueue: () => void,
	): void {
		if (this.isDisposed || this.retryQueueWakeSubscriptions.has(queue)) {
			return;
		}

		const retryAt = readRetryAt();
		if (retryAt === null) {
			return;
		}

		// Cooldown-blocked Jikan rows stay out of active daemon reads. One
		// wake-up timer per queue prevents event-bus loops, does not block newly
		// enqueued rows, and complements startup/periodic sweeps for recovery.
		const retrySubscription = timer(
			Math.max(
				0,
				retryAt - Date.now(),
			),
		).subscribe(() => {
			this.clearScheduledRetryWake(queue);
			processQueue();
		});
		this.retryQueueWakeSubscriptions.set(
			queue,
			retrySubscription,
		);
		this.subscriptions.add(retrySubscription);
	}
}
