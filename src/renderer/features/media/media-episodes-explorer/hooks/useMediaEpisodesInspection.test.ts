// @vitest-environment jsdom

import type {
	MediaEpisodeInspectionRow,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
	MediaInspectionData,
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
import { useMediaEpisodesInspection } from "./useMediaEpisodesInspection";

const mediaInspectionRunner = vi.hoisted(() => ({
	getMediaInspection:            vi.fn<(mediaId: number) => Promise<MediaInspectionData | null>>(),
	mediaEpisodesListChanges:      vi.fn<() => Observable<MediaEpisodesListChangedEvent>>(),
	mediaEpisodesItemsPatched:     vi.fn<() => Observable<MediaEpisodesItemsPatchedEvent>>(),
	preferredTitleLanguageChanges: vi.fn<() => Observable<"english" | "romaji" | "native">>(),
}));

vi.mock(
	"../../media-inspection-runner",
	() => ({
		getMediaInspection:            mediaInspectionRunner.getMediaInspection,
		mediaEpisodesListChanges:      mediaInspectionRunner.mediaEpisodesListChanges,
		mediaEpisodesItemsPatched:     mediaInspectionRunner.mediaEpisodesItemsPatched,
		preferredTitleLanguageChanges: mediaInspectionRunner.preferredTitleLanguageChanges,
	}),
);

interface RenderedHook<T, P extends object> {
	result: { readonly current: T };
	rerender: (props: P) => void;
	unmount: () => void;
}

interface TestStream<T> {
	cleanup: ReturnType<typeof vi.fn>;
	emit: (event: T) => void;
	stream$: Observable<T>;
}

function createTestStream<T>(): TestStream<T> {
	let listener: ((event: T) => void) | null = null;
	const cleanup                             = vi.fn();

	return {
		cleanup,
		emit:    (event: T) => {
			listener?.(event);
		},
		stream$: new Observable<T>((subscriber) => {
			listener = (event) => subscriber.next(event);
			return cleanup;
		}),
	};
}

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<T, P extends object>(
	useHook: (props: P) => T,
	initialProps: P,
): RenderedHook<T, P> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(props: P): ReactElement | null {
		currentValue = useHook(props);
		return null;
	}

	const render = (props: P) => {
		flushSync(() => {
			root.render(createElement(
				HookHost,
				props,
			));
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
	render(initialProps);

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

async function waitForAssertion(assertion: () => void): Promise<void> {
	const startedAt = Date.now();
	let lastError: unknown;

	while (Date.now() - startedAt < 1000) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await new Promise(resolve => window.setTimeout(
				resolve,
				0,
			));
		}
	}

	throw lastError instanceof Error ? lastError : new Error("Timed out waiting for assertion.");
}

function createDeferred<T>(): Deferred<T> {
	let resolveDeferred: (value: T) => void        = () => {};
	let rejectDeferred: (reason?: unknown) => void = () => {};
	const promise                                  = new Promise<T>((
		resolve,
		reject,
	) => {
		resolveDeferred = resolve;
		rejectDeferred  = reject;
	});

	return {
		promise,
		resolve: resolveDeferred,
		reject:  rejectDeferred,
	};
}

function createEpisode(
	episodeNumber: number,
	isWatched: boolean = false,
): MediaEpisodeInspectionRow {
	return {
		mediaId:           1,
		episodeNumber,
		name:              `Episode ${ episodeNumber }`,
		integrationStatus: null,
		isWatched,
	};
}

function createMedia(
	name: string,
	episodes: MediaEpisodeInspectionRow[] = [ createEpisode(1) ],
): MediaInspectionData {
	return {
		mediaId:                           1,
		name,
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		episodes,
	};
}

describe(
	"useMediaEpisodesInspection",
	() => {
		let listChangedStream: TestStream<MediaEpisodesListChangedEvent>;
		let itemsPatchedStream: TestStream<MediaEpisodesItemsPatchedEvent>;
		let titleLanguageChangedStream: TestStream<"english" | "romaji" | "native">;

		beforeEach(
			() => {
				vi.clearAllMocks();
				listChangedStream          = createTestStream<MediaEpisodesListChangedEvent>();
				itemsPatchedStream         = createTestStream<MediaEpisodesItemsPatchedEvent>();
				titleLanguageChangedStream = createTestStream<"english" | "romaji" | "native">();

				mediaInspectionRunner.mediaEpisodesListChanges.mockReturnValue(listChangedStream.stream$);
				mediaInspectionRunner.mediaEpisodesItemsPatched.mockReturnValue(itemsPatchedStream.stream$);
				mediaInspectionRunner.preferredTitleLanguageChanges.mockReturnValue(titleLanguageChangedStream.stream$);
			},
		);

		afterEach(
			() => {
				cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
				cleanupRenderedHooks = [];
				vi.restoreAllMocks();
			},
		);

		it(
			"keeps the newest media snapshot when an older refresh resolves later",
			async () => {
				const slowInitialRefresh = createDeferred<MediaInspectionData | null>();
				const fastSilentRefresh  = createDeferred<MediaInspectionData | null>();
				mediaInspectionRunner.getMediaInspection
					.mockReturnValueOnce(slowInitialRefresh.promise)
					.mockReturnValueOnce(fastSilentRefresh.promise);

				const { result } = renderHook(
					() => useMediaEpisodesInspection(1),
					{},
				);

				flushSync(
					() => {
						void result.current.refreshMedia(false);
					},
				);
				fastSilentRefresh.resolve(createMedia("new snapshot"));
				await fastSilentRefresh.promise;
				await waitForAssertion(() => expect(result.current.media?.name).toBe("new snapshot"));

				slowInitialRefresh.resolve(createMedia("stale snapshot"));
				await slowInitialRefresh.promise;
				await waitForAssertion(() => expect(result.current.isLoading).toBe(false));

				expect(result.current.media?.name).toBe("new snapshot");
				expect(result.current.isLoading).toBe(false);
			},
		);

		it(
			"reacts to list, title-language, and item patch events for the active media",
			async () => {
				mediaInspectionRunner.getMediaInspection
					.mockResolvedValueOnce(createMedia("initial"))
					.mockResolvedValueOnce(createMedia("list refresh"))
					.mockResolvedValueOnce(createMedia("title refresh"));

				const { result } = renderHook(
					() => useMediaEpisodesInspection(1),
					{},
				);
				await waitForAssertion(() => expect(result.current.media?.name).toBe("initial"));

				flushSync(
					() => {
						itemsPatchedStream.emit({
							mediaId: 1,
							patches: [
								{
									episodeNumber:     1,
									isWatched:         true,
									integrationStatus: "tracked",
								},
							],
						});
					},
				);

				expect(result.current.media?.episodes[ 0 ].isWatched).toBe(true);
				expect(result.current.media?.episodes[ 0 ].integrationStatus).toBe("tracked");

				flushSync(
					() => {
						listChangedStream.emit({ mediaId: 2 });
					},
				);
				expect(mediaInspectionRunner.getMediaInspection).toHaveBeenCalledTimes(1);

				flushSync(
					() => {
						listChangedStream.emit({ mediaId: 1 });
					},
				);
				await waitForAssertion(() => expect(result.current.media?.name).toBe("list refresh"));

				flushSync(
					() => {
						titleLanguageChangedStream.emit("romaji");
					},
				);
				await waitForAssertion(() => expect(result.current.media?.name).toBe("title refresh"));
			},
		);

		it(
			"unsubscribes all episode inspection listeners on unmount",
			() => {
				mediaInspectionRunner.getMediaInspection.mockResolvedValue(createMedia("initial"));

				const { unmount } = renderHook(
					() => useMediaEpisodesInspection(1),
					{},
				);
				unmount();

				expect(listChangedStream.cleanup).toHaveBeenCalledTimes(1);
				expect(itemsPatchedStream.cleanup).toHaveBeenCalledTimes(1);
				expect(titleLanguageChangedStream.cleanup).toHaveBeenCalledTimes(1);
			},
		);
	},
);
