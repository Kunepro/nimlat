// @vitest-environment node
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

function installAniListQueueApiMock() {
	let pauseListener: ((seconds: number) => void) | null = null;
	const unsubscribePauseListener                        = vi.fn();
	const aniListQueue                                    = {
		onPaused: vi.fn((listener: (seconds: number) => void) => {
			pauseListener = listener;
			return unsubscribePauseListener;
		}),
	};

	vi.stubGlobal(
		"window",
		{
			electronAPI: {
				aniListQueue,
			},
		},
	);

	return {
		aniListQueue,
		unsubscribePauseListener,
		emitPaused: (seconds: number) => {
			if (!pauseListener) {
				throw new Error("AniList queue pause listener was not registered.");
			}

			pauseListener(seconds);
		},
	};
}

describe(
	"AniListQueueStatusService",
	() => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.resetModules();
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.unstubAllGlobals();
		});

		it(
			"converts pause events into a countdown status stream",
			async () => {
				const { emitPaused }                                                   = installAniListQueueApiMock();
				const { AniListQueueStatusService }                                    = await import("./ani-list-queue-status-service");
				const statuses: Array<{ isPaused: boolean; remainingSeconds: number }> = [];

				const subscription = AniListQueueStatusService.statusChanges().subscribe((status) => {
					statuses.push(status);
				});

				expect(statuses).toEqual([
					{
						isPaused:         false,
						remainingSeconds: 0,
					},
				]);

				emitPaused(3);
				expect(statuses.at(-1)).toEqual({
					isPaused:         true,
					remainingSeconds: 3,
				});

				await vi.advanceTimersByTimeAsync(1000);
				expect(statuses.at(-1)).toEqual({
					isPaused:         true,
					remainingSeconds: 2,
				});

				await vi.advanceTimersByTimeAsync(2000);
				expect(statuses.at(-1)).toEqual({
					isPaused:         false,
					remainingSeconds: 0,
				});

				subscription.unsubscribe();
			},
		);

		it(
			"shares one preload listener across subscribers",
			async () => {
				const {
								aniListQueue,
								emitPaused,
								unsubscribePauseListener,
							}                             = installAniListQueueApiMock();
				const { AniListQueueStatusService } = await import("./ani-list-queue-status-service");
				const firstListener                 = vi.fn();
				const secondListener                = vi.fn();

				const firstSubscription  = AniListQueueStatusService.statusChanges().subscribe(firstListener);
				const secondSubscription = AniListQueueStatusService.statusChanges().subscribe(secondListener);

				expect(aniListQueue.onPaused).toHaveBeenCalledTimes(1);
				emitPaused(2);
				expect(firstListener).toHaveBeenLastCalledWith({
					isPaused:         true,
					remainingSeconds: 2,
				});
				expect(secondListener).toHaveBeenLastCalledWith({
					isPaused:         true,
					remainingSeconds: 2,
				});

				firstSubscription.unsubscribe();
				expect(unsubscribePauseListener).not.toHaveBeenCalled();

				secondSubscription.unsubscribe();
				expect(unsubscribePauseListener).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"restarts the countdown when a newer pause event arrives",
			async () => {
				const { emitPaused }                                                   = installAniListQueueApiMock();
				const { AniListQueueStatusService }                                    = await import("./ani-list-queue-status-service");
				const statuses: Array<{ isPaused: boolean; remainingSeconds: number }> = [];

				const subscription = AniListQueueStatusService.statusChanges().subscribe((status) => {
					statuses.push(status);
				});

				emitPaused(5);
				await vi.advanceTimersByTimeAsync(2000);
				expect(statuses.at(-1)).toEqual({
					isPaused:         true,
					remainingSeconds: 3,
				});

				emitPaused(10);
				expect(statuses.at(-1)).toEqual({
					isPaused:         true,
					remainingSeconds: 10,
				});

				await vi.advanceTimersByTimeAsync(10000);
				expect(statuses.at(-1)).toEqual({
					isPaused:         false,
					remainingSeconds: 0,
				});

				subscription.unsubscribe();
			},
		);
	},
);
