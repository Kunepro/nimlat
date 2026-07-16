// @vitest-environment jsdom

import type {
	IntegrationStatusActionResult,
	MediaEpisodeInspectionRow,
	MediaInspectionData,
	MediaWatchStateActionResult,
} from "@nimlat/types/ipc-payloads";
import message from "antd/es/message";
import {
	createElement,
	type ReactElement,
	useState,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../../../facades";
import { useMediaEpisodeMutations } from "./useMediaEpisodeMutations";

interface RenderedHook<T, P extends object> {
	result: { readonly current: T };
	rerender: (props: P) => void;
	unmount: () => void;
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

function createEpisode(
	episodeNumber: number,
	integrationStatus: MediaEpisodeInspectionRow["integrationStatus"] = null,
	isWatched: boolean                                                = false,
): MediaEpisodeInspectionRow {
	return {
		mediaId: 1,
		episodeNumber,
		name:    `Episode ${ episodeNumber }`,
		integrationStatus,
		isWatched,
	};
}

function createMedia(): MediaInspectionData {
	return {
		mediaId:                           1,
		name:                              "Media",
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		episodes:                          [
			createEpisode(
				1,
				"tracked",
				false,
			),
			createEpisode(
				2,
				null,
				false,
			),
		],
	};
}

function useMutationHarness(selectedEpisodeNumberList: number[]) {
	const [ media, setMedia ] = useState<MediaInspectionData | null>(() => createMedia());
	const mutations           = useMediaEpisodeMutations({
		mediaIdNumber: 1,
		episodes:      media?.episodes ?? [],
		selectedEpisodeNumberList,
		setMedia,
	});

	return {
		media,
		...mutations,
	};
}

describe(
	"useMediaEpisodeMutations",
	() => {
		beforeEach(
			() => {
				vi.spyOn(
					message,
					"error",
				).mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
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
			"rolls back an optimistic watched toggle when the IPC write fails",
			async () => {
				const watchedWrite = createDeferred<MediaWatchStateActionResult>();
				vi.spyOn(
					GroupExplorerFacade,
					"setEpisodeWatchState",
				).mockReturnValue(watchedWrite.promise);
				const { result } = renderHook(
					() => useMutationHarness([ 1 ]),
					{},
				);

				let mutationPromise: Promise<void> | null = null;
				flushSync(
					() => {
						mutationPromise = result.current.handleEpisodeWatchedToggle(
							1,
							true,
						);
					},
				);

				expect(result.current.media?.episodes[ 0 ].isWatched).toBe(true);
				expect(Array.from(result.current.updatingWatchedEpisodeNumberSet)).toEqual([ 1 ]);

				watchedWrite.resolve({
					success: false,
					error:   "write failed",
				});
				await mutationPromise;

				await waitForAssertion(() => {
					expect(result.current.media?.episodes[ 0 ].isWatched).toBe(false);
					expect(Array.from(result.current.updatingWatchedEpisodeNumberSet)).toEqual([]);
				});
				expect(message.error).toHaveBeenCalledWith("write failed");
			},
		);

		it(
			"rolls back selected episode statuses when a bulk IPC write fails",
			async () => {
				const statusWrite = createDeferred<IntegrationStatusActionResult>();
				vi.spyOn(
					GroupExplorerFacade,
					"setEpisodeIntegrationStatuses",
				).mockReturnValue(statusWrite.promise);
				const { result } = renderHook(
					() => useMutationHarness([
						1,
						2,
					]),
					{},
				);

				let mutationPromise: Promise<void> | null = null;
				flushSync(
					() => {
						mutationPromise = result.current.handleSelectedEpisodesIntegrationStatusChange("downloaded");
					},
				);

				expect(result.current.media?.episodes.map(episode => episode.integrationStatus)).toEqual([
					"downloaded",
					"downloaded",
				]);
				expect(Array.from(result.current.updatingEpisodeNumberSet)).toEqual([
					1,
					2,
				]);
				expect(result.current.isBulkUpdatingEpisodes).toBe(true);

				statusWrite.resolve({
					success: false,
					error:   "bulk failed",
				});
				await mutationPromise;

				await waitForAssertion(() => {
					expect(result.current.media?.episodes.map(episode => episode.integrationStatus ?? null)).toEqual([
						"tracked",
						null,
					]);
					expect(Array.from(result.current.updatingEpisodeNumberSet)).toEqual([]);
					expect(result.current.isBulkUpdatingEpisodes).toBe(false);
				});
				expect(message.error).toHaveBeenCalledWith("bulk failed");
			},
		);

		it(
			"sends playback issue saves through the facade without mutating local episode rows",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"saveEpisodeIntegrationState",
				).mockResolvedValue({ success: true });
				const { result } = renderHook(
					() => useMutationHarness([ 1 ]),
					{},
				);
				const episode    = result.current.media?.episodes[ 0 ];
				expect(episode).toBeDefined();

				await result.current.handleEpisodePlaybackIssueSave(
					episode as MediaEpisodeInspectionRow,
					{
						integrationStatus:    "tracked",
						playbackIssueNote:    "Needs review",
						playbackIssueMoments: [],
					},
				);

				expect(GroupExplorerFacade.saveEpisodeIntegrationState).toHaveBeenCalledWith({
					mediaId:              1,
					episodeNumber:        1,
					integrationStatus:    "tracked",
					playbackIssueNote:    "Needs review",
					playbackIssueMoments: [],
				});
				expect(result.current.media?.episodes[ 0 ]).toBe(episode);
			},
		);
	},
);
