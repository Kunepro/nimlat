// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	type AniListRateLimiterPriority,
	AniListRateLimiterQueue,
	type QueuedAniListRequest,
} from "./ani-list-rate-limiter-queue";

function requestFixture(priority: AniListRateLimiterPriority, label: string): QueuedAniListRequest {
	return {
		context:    { operation: label },
		enqueuedAt: 1,
		execute:    vi.fn(),
		priority,
		reject:     vi.fn(),
		resolve:    vi.fn(),
	};
}

describe(
	"AniListRateLimiterQueue",
	() => {
		it(
			"dequeues higher-priority lanes before older lower-priority work",
			() => {
				const queue      = new AniListRateLimiterQueue();
				const background = requestFixture(
					"background",
					"background",
				);
				const mediaData  = requestFixture(
					"media-data",
					"media",
				);
				const manual     = requestFixture(
					"manual",
					"manual",
				);

				queue.enqueue(background);
				queue.enqueue(mediaData);
				queue.enqueue(manual);

				expect(queue.getSnapshot()).toEqual({
					queueManual:          1,
					queueSeriesHydration: 0,
					queueMediaData:       1,
					queueBackground:      1,
				});
				expect(queue.dequeueNext()).toBe(manual);
				expect(queue.dequeueNext()).toBe(mediaData);
				expect(queue.dequeueNext()).toBe(background);
				expect(queue.dequeueNext()).toBeUndefined();
			},
		);

		it(
			"requeues rate-limited work at the front of its original lane",
			() => {
				const queue  = new AniListRateLimiterQueue();
				const first  = requestFixture(
					"series-hydration",
					"first",
				);
				const second = requestFixture(
					"series-hydration",
					"second",
				);

				queue.enqueue(second);
				queue.requeueFront(first);

				expect(queue.dequeueNext()).toBe(first);
				expect(queue.dequeueNext()).toBe(second);
			},
		);
	},
);
