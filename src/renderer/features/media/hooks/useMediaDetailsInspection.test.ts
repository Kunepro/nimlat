// @vitest-environment jsdom

import type {
	GroupMediaListChangedEvent,
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
import { useMediaDetailsInspection } from "./useMediaDetailsInspection";

const routeParams = vi.hoisted(() => ({
	groupSource: "official" as string | undefined,
	mediaId:     "1",
}));

const mediaInspectionRunner = vi.hoisted(() => ({
	getMediaInspection:            vi.fn<(mediaId: number, options?: {
		includeEpisodes?: boolean;
		groupSource?: "official" | "user"
	}) => Promise<MediaInspectionData | null>>(),
	groupMediaListChanges:         vi.fn<() => Observable<GroupMediaListChangedEvent>>(),
	mediaEpisodesListChanges:      vi.fn<() => Observable<MediaEpisodesListChangedEvent>>(),
	preferredTitleLanguageChanges: vi.fn<() => Observable<"english" | "romaji" | "native">>(),
}));

vi.mock(
	"@tanstack/react-router",
	() => ({
		useParams: () => routeParams,
	}),
);

vi.mock(
	"../media-inspection-runner",
	() => ({
		getMediaInspection:            mediaInspectionRunner.getMediaInspection,
		groupMediaListChanges:         mediaInspectionRunner.groupMediaListChanges,
		mediaEpisodesListChanges:      mediaInspectionRunner.mediaEpisodesListChanges,
		preferredTitleLanguageChanges: mediaInspectionRunner.preferredTitleLanguageChanges,
	}),
);

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

interface RenderedHook<T> {
	result: { readonly current: T };
	rerender: () => void;
	unmount: () => void;
}

interface TestStream<T> {
	cleanup: ReturnType<typeof vi.fn>;
	emit: (event: T) => void;
	stream$: Observable<T>;
}

let cleanupRenderedHooks: Array<() => void> = [];

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

function createMedia(
	mediaId: number,
	name: string,
): MediaInspectionData {
	return {
		mediaId,
		name,
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		episodes:                          [],
	};
}

describe(
	"useMediaDetailsInspection",
	() => {
		let groupListChangedStream: TestStream<GroupMediaListChangedEvent>;
		let episodeListChangedStream: TestStream<MediaEpisodesListChangedEvent>;
		let titleLanguageChangedStream: TestStream<"english" | "romaji" | "native">;

		beforeEach(
			() => {
				vi.clearAllMocks();
				routeParams.groupSource = "official";
				routeParams.mediaId     = "1";

				groupListChangedStream     = createTestStream<GroupMediaListChangedEvent>();
				episodeListChangedStream   = createTestStream<MediaEpisodesListChangedEvent>();
				titleLanguageChangedStream = createTestStream<"english" | "romaji" | "native">();

				mediaInspectionRunner.groupMediaListChanges.mockReturnValue(groupListChangedStream.stream$);
				mediaInspectionRunner.mediaEpisodesListChanges.mockReturnValue(episodeListChangedStream.stream$);
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
			"loads compact route-scoped media details",
			async () => {
				mediaInspectionRunner.getMediaInspection.mockResolvedValue(createMedia(
					1,
					"initial",
				));

				const { result } = renderHook(() => useMediaDetailsInspection());

				expect(result.current.numericMediaId).toBe(1);
				await waitForAssertion(() => expect(result.current.media?.name).toBe("initial"));
				expect(result.current.isLoading).toBe(false);
				expect(result.current.errorMessage).toBeNull();
				expect(mediaInspectionRunner.getMediaInspection).toHaveBeenCalledWith(
					1,
					{
						includeEpisodes: false,
						groupSource:     "official",
					},
				);
			},
		);

		it(
			"keeps the newest details snapshot when an older refresh resolves later",
			async () => {
				const slowInitialRefresh = createDeferred<MediaInspectionData | null>();
				const fastSilentRefresh  = createDeferred<MediaInspectionData | null>();
				mediaInspectionRunner.getMediaInspection
					.mockReturnValueOnce(slowInitialRefresh.promise)
					.mockReturnValueOnce(fastSilentRefresh.promise);

				const { result } = renderHook(() => useMediaDetailsInspection());

				flushSync(
					() => {
						void result.current.refreshMedia(false);
					},
				);
				fastSilentRefresh.resolve(createMedia(
					1,
					"fresh details",
				));
				await fastSilentRefresh.promise;
				await waitForAssertion(() => expect(result.current.media?.name).toBe("fresh details"));

				slowInitialRefresh.resolve(createMedia(
					1,
					"stale details",
				));
				await slowInitialRefresh.promise;
				await waitForAssertion(() => expect(result.current.isLoading).toBe(false));

				expect(result.current.media?.name).toBe("fresh details");
			},
		);

		it(
			"reacts to group, episode, and title events for the active media",
			async () => {
				mediaInspectionRunner.getMediaInspection
					.mockResolvedValueOnce(createMedia(
						1,
						"initial",
					))
					.mockResolvedValueOnce(createMedia(
						1,
						"group refresh",
					))
					.mockResolvedValueOnce(createMedia(
						1,
						"episode refresh",
					))
					.mockResolvedValueOnce(createMedia(
						1,
						"title refresh",
					));

				const { result } = renderHook(() => useMediaDetailsInspection());
				await waitForAssertion(() => expect(result.current.media?.name).toBe("initial"));

				flushSync(
					() => {
						groupListChangedStream.emit({ affectedMediaIds: [ 2 ] });
						episodeListChangedStream.emit({ mediaId: 2 });
					},
				);
				expect(mediaInspectionRunner.getMediaInspection).toHaveBeenCalledTimes(1);

				flushSync(
					() => {
						groupListChangedStream.emit({ affectedMediaIds: [ 1 ] });
					},
				);
				await waitForAssertion(() => expect(result.current.media?.name).toBe("group refresh"));

				flushSync(
					() => {
						episodeListChangedStream.emit({ mediaId: 1 });
					},
				);
				await waitForAssertion(() => expect(result.current.media?.name).toBe("episode refresh"));

				flushSync(
					() => {
						titleLanguageChangedStream.emit("romaji");
					},
				);
				await waitForAssertion(() => expect(result.current.media?.name).toBe("title refresh"));
			},
		);

		it(
			"unsubscribes all details listeners on unmount",
			() => {
				mediaInspectionRunner.getMediaInspection.mockResolvedValue(createMedia(
					1,
					"initial",
				));

				const { unmount } = renderHook(() => useMediaDetailsInspection());
				unmount();

				expect(groupListChangedStream.cleanup).toHaveBeenCalledTimes(1);
				expect(episodeListChangedStream.cleanup).toHaveBeenCalledTimes(1);
				expect(titleLanguageChangedStream.cleanup).toHaveBeenCalledTimes(1);
			},
		);
	},
);
