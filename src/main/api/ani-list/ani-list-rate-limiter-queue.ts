const ANILIST_RATE_LIMITER_PRIORITY_ORDER = [
	"manual",
	"series-hydration",
	"media-data",
	"background",
] as const;

export type AniListRateLimiterPriority = (typeof ANILIST_RATE_LIMITER_PRIORITY_ORDER)[number];

export type QueueSnapshot = {
	queueManual: number;
	queueSeriesHydration: number;
	queueMediaData: number;
	queueBackground: number;
};

export interface AniListRateLimiterRequestContext {
	operation: string;
	queue?: string;
	mediaId?: number;
	idAniList?: number;
	page?: number;
	perPage?: number;
	sort?: string[];
	source?: string;
	recovery?: string;
}

export interface QueuedAniListRequest<T = unknown> {
	execute: () => Promise<T>;
	resolve: (val: T) => void;
	reject: (err: unknown) => void;
	priority: AniListRateLimiterPriority;
	context: AniListRateLimiterRequestContext;
	enqueuedAt: number;
}

// Priority lanes are kept in one small class so limiter scheduling can focus on
// network/rate-limit lifecycle while queue ordering remains independently testable.
export class AniListRateLimiterQueue {
	private readonly queues: Record<AniListRateLimiterPriority, QueuedAniListRequest[]> = {
		manual:             [],
		"series-hydration": [],
		"media-data":       [],
		background:         [],
	};

	public enqueue(request: QueuedAniListRequest): void {
		this.queues[ request.priority ].push(request);
	}

	public dequeueNext(): QueuedAniListRequest | undefined {
		for (const priority of ANILIST_RATE_LIMITER_PRIORITY_ORDER) {
			const request = this.queues[ priority ].shift();
			if (request) {
				return request;
			}
		}

		return undefined;
	}

	public requeueFront(request: QueuedAniListRequest): void {
		// 429 retries must stay at the front of their original lane so a rate-limited
		// request does not lose its place behind newer requests of the same class.
		this.queues[ request.priority ].unshift(request);
	}

	public getSnapshot(): QueueSnapshot {
		return {
			queueManual:          this.queues.manual.length,
			queueSeriesHydration: this.queues[ "series-hydration" ].length,
			queueMediaData:       this.queues[ "media-data" ].length,
			queueBackground:      this.queues.background.length,
		};
	}
}
