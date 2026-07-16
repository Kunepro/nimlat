// @vitest-environment jsdom
import type {
	MediaEpisodesListChangedEvent,
	MediaEpisodeUpdatesIssue,
	RetryMediaEpisodeUpdatesResult,
} from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { Observable } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useEpisodeUpdatesStatus } from "./useEpisodeUpdatesStatus";

const episodeUpdatesRunner = vi.hoisted(() => ({
	getMediaEpisodeUpdatesIssue:    vi.fn<(mediaId: number) => Promise<MediaEpisodeUpdatesIssue | null>>(),
	mediaEpisodeUpdatesListChanges: vi.fn<() => Observable<MediaEpisodesListChangedEvent>>(),
	retryMediaEpisodeUpdates:       vi.fn<(mediaId: number) => Promise<RetryMediaEpisodeUpdatesResult>>(),
}));

vi.mock(
	"../../../features/media/media-episode-updates-runner",
	() => ({
		getMediaEpisodeUpdatesIssue:    episodeUpdatesRunner.getMediaEpisodeUpdatesIssue,
		mediaEpisodeUpdatesListChanges: episodeUpdatesRunner.mediaEpisodeUpdatesListChanges,
		retryMediaEpisodeUpdates:       episodeUpdatesRunner.retryMediaEpisodeUpdates,
	}),
);

interface RenderedHook<T> {
	result: { readonly current: T };
	rerender: () => void;
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];
let mediaEpisodesListChangedStream: ReturnType<typeof createTestStream<MediaEpisodesListChangedEvent>>;
let unsubscribeMediaEpisodesListChanged: ReturnType<typeof vi.fn>;

function createTestStream<TEvent>() {
	let listener: ((event: TEvent) => void) | null = null;
	const unsubscribe                              = vi.fn();
	const observable                               = new Observable<TEvent>((subscriber) => {
		listener = event => subscriber.next(event);
		return unsubscribe;
	});

	return {
		emit: (event: TEvent) => {
			if (!listener) {
				throw new Error("Media episodes list stream was emitted before subscription.");
			}

			listener(event);
		},
		observable,
		unsubscribe,
	};
}

function createIssue(
	mediaId: number,
	status: MediaEpisodeUpdatesIssue["status"],
	retryCount = 0,
): MediaEpisodeUpdatesIssue {
	return {
		mediaId,
		retryCount,
		status,
	};
}

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook();
		return null;
	}

	const render = () => {
		flushSync(() => {
			root.render(createElement(HookHost));
		});
	};

	const unmount = () => {
		if (!isMounted) {
			return;
		}

		isMounted = false;
		flushSync(() => {
			root.unmount();
		});
	};

	cleanupRenderedHooks.push(unmount);
	render();

	return {
		result:   {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}
				return currentValue;
			},
		},
		rerender: render,
		unmount,
	};
}

function createDeferredIssue() {
	let resolve: ((value: MediaEpisodeUpdatesIssue | null) => void) | null = null;
	const promise                                                          = new Promise<MediaEpisodeUpdatesIssue | null>((deferredResolve) => {
		resolve = deferredResolve;
	});

	return {
		promise,
		resolve: (issue: MediaEpisodeUpdatesIssue | null) => {
			if (!resolve) {
				throw new Error("Deferred issue was not initialized.");
			}

			resolve(issue);
		},
	};
}

async function flushHookEffects() {
	await new Promise(resolve => setTimeout(
		resolve,
		0,
	));
	await Promise.resolve();
	await Promise.resolve();
}

async function waitForHookExpectation(assertExpectation: () => void): Promise<void> {
	let lastError: unknown;

	for (let attempt = 0; attempt < 20; attempt += 1) {
		await flushHookEffects();
		try {
			assertExpectation();
			return;
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

describe(
	"useEpisodeUpdatesStatus",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			mediaEpisodesListChangedStream      = createTestStream<MediaEpisodesListChangedEvent>();
			unsubscribeMediaEpisodesListChanged = mediaEpisodesListChangedStream.unsubscribe;
			episodeUpdatesRunner.getMediaEpisodeUpdatesIssue.mockResolvedValue(null);
			episodeUpdatesRunner.retryMediaEpisodeUpdates.mockResolvedValue({ success: true });
			episodeUpdatesRunner.mediaEpisodeUpdatesListChanges.mockReturnValue(mediaEpisodesListChangedStream.observable);
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
		});

		it(
			"loads initial issue state and refreshes on matching episode-list events",
			async () => {
				episodeUpdatesRunner.getMediaEpisodeUpdatesIssue
					.mockResolvedValueOnce(createIssue(
						42,
						"failed",
						1,
					))
					.mockResolvedValueOnce(createIssue(
						42,
						"pending",
						0,
					));

				const { result } = renderHook(() => useEpisodeUpdatesStatus({ mediaId: 42 }));

				expect(result.current.issue).toBeNull();
				await waitForHookExpectation(() => {
					expect(result.current.issue).toEqual(createIssue(
						42,
						"failed",
						1,
					));
				});

				mediaEpisodesListChangedStream.emit({ mediaId: 7 });
				await flushHookEffects();
				expect(episodeUpdatesRunner.getMediaEpisodeUpdatesIssue).toHaveBeenCalledTimes(1);

				mediaEpisodesListChangedStream.emit({ mediaId: 42 });
				await waitForHookExpectation(() => {
					expect(result.current.issue).toEqual(createIssue(
						42,
						"pending",
						0,
					));
				});
			},
		);

		it(
			"ignores stale issue refresh responses",
			async () => {
				const slowInitialIssue = createDeferredIssue();
				const fastRefreshIssue = createDeferredIssue();
				episodeUpdatesRunner.getMediaEpisodeUpdatesIssue
					.mockReturnValueOnce(slowInitialIssue.promise)
					.mockReturnValueOnce(fastRefreshIssue.promise);

				const { result } = renderHook(() => useEpisodeUpdatesStatus({ mediaId: 42 }));
				await flushHookEffects();

				mediaEpisodesListChangedStream.emit({ mediaId: 42 });
				fastRefreshIssue.resolve(createIssue(
					42,
					"processing",
					0,
				));
				await fastRefreshIssue.promise;
				await waitForHookExpectation(() => {
					expect(result.current.issue).toEqual(createIssue(
						42,
						"processing",
						0,
					));
				});

				slowInitialIssue.resolve(createIssue(
					42,
					"failed",
					2,
				));
				await slowInitialIssue.promise;
				await waitForHookExpectation(() => {
					expect(result.current.issue).toEqual(createIssue(
						42,
						"processing",
						0,
					));
				});
			},
		);

		it(
			"queues retry success as pending and notifies the caller",
			async () => {
				const onRequestedRetry = vi.fn();
				episodeUpdatesRunner.retryMediaEpisodeUpdates.mockResolvedValueOnce({ success: true });
				const { result } = renderHook(() => useEpisodeUpdatesStatus({
					mediaId: 42,
					onRequestedRetry,
				}));
				await flushHookEffects();

				result.current.retryEpisodeUpdates();
				await waitForHookExpectation(() => {
					expect(episodeUpdatesRunner.retryMediaEpisodeUpdates).toHaveBeenCalledWith(42);
					expect(result.current.issue).toEqual(createIssue(
						42,
						"pending",
						0,
					));
					expect(result.current.isRetrying).toBe(false);
					expect(onRequestedRetry).toHaveBeenCalledTimes(1);
				});
			},
		);

		it(
			"stores retry failures and always clears retrying state",
			async () => {
				episodeUpdatesRunner.getMediaEpisodeUpdatesIssue.mockResolvedValueOnce(createIssue(
					42,
					"failed",
					3,
				));
				episodeUpdatesRunner.retryMediaEpisodeUpdates.mockResolvedValueOnce({
					success: false,
					error:   "retry failed",
				});
				const { result } = renderHook(() => useEpisodeUpdatesStatus({ mediaId: 42 }));
				await flushHookEffects();

				result.current.retryEpisodeUpdates();
				await waitForHookExpectation(() => {
					expect(result.current.issue).toEqual({
						mediaId:      42,
						status:       "failed",
						errorMessage: "retry failed",
						retryCount:   3,
					});
					expect(result.current.isRetrying).toBe(false);
				});
			},
		);

		it(
			"unsubscribes from media episode events on unmount",
			() => {
				const { unmount } = renderHook(() => useEpisodeUpdatesStatus({ mediaId: 42 }));

				unmount();

				expect(unsubscribeMediaEpisodesListChanged).toHaveBeenCalledTimes(1);
			},
		);
	},
);
