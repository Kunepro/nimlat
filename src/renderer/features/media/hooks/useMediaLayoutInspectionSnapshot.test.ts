// @vitest-environment jsdom

import type { MediaInspectionData } from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import {
	createRoot,
	type Root,
} from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { MediaLayoutInspectionSnapshot } from "../media-layout-model";
import { useMediaLayoutInspectionSnapshot } from "./useMediaLayoutInspectionSnapshot";

const mediaInspectionRunner = vi.hoisted(() => ({
	getMediaInspection: vi.fn<(mediaId: number, options: {
		includeEpisodes: false
	}) => Promise<MediaInspectionData | null>>(),
}));

vi.mock(
	"../media-inspection-runner",
	() => ({
		getMediaInspection: mediaInspectionRunner.getMediaInspection,
	}),
);

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
}

interface RenderedHook {
	rerender: (nextMediaId: string) => void;
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function createDeferred<T>(): Deferred<T> {
	let resolve: ((value: T) => void) | null = null;
	const promise                            = new Promise<T>((deferredResolve) => {
		resolve = deferredResolve;
	});

	return {
		promise,
		resolve: (value: T) => {
			if (!resolve) {
				throw new Error("Deferred promise was not initialized.");
			}
			resolve(value);
		},
	};
}

function createMedia(mediaId: number, name: string): MediaInspectionData {
	return {
		mediaId,
		name,
		isFilm:                            false,
		supportsMediaPlaybackIssueMoments: false,
		episodes:                          [],
	};
}

async function flushHookEffects(): Promise<void> {
	for (let index = 0; index < 3; index += 1) {
		await new Promise(resolve => setTimeout(
			resolve,
			0,
		));
		await Promise.resolve();
	}
}

function renderInspectionSnapshotHook(
	initialMediaId: string,
	applyInspectionSnapshot: (snapshot: MediaLayoutInspectionSnapshot) => void,
): RenderedHook {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let mediaId      = initialMediaId;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		useMediaLayoutInspectionSnapshot({
			mediaId,
			applyInspectionSnapshot,
		});
		return null;
	}

	const render = () => {
		flushSync(() => {
			root.render(createElement(HookHost));
		});
	};

	render();

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

	return {
		rerender: (nextMediaId: string) => {
			mediaId = nextMediaId;
			render();
		},
		unmount,
	};
}

describe(
	"useMediaLayoutInspectionSnapshot",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanup => cleanup());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"ignores stale inspection responses after the media route changes",
			async () => {
				const slowFirstLoad  = createDeferred<MediaInspectionData | null>();
				const fastSecondLoad = createDeferred<MediaInspectionData | null>();
				mediaInspectionRunner.getMediaInspection
					.mockReturnValueOnce(slowFirstLoad.promise)
					.mockReturnValueOnce(fastSecondLoad.promise);
				const applyInspectionSnapshot = vi.fn();

				const renderedHook = renderInspectionSnapshotHook(
					"1",
					applyInspectionSnapshot,
				);
				await flushHookEffects();

				renderedHook.rerender("2");
				await flushHookEffects();

				fastSecondLoad.resolve(createMedia(
					2,
					"Fast media",
				));
				await fastSecondLoad.promise;
				await flushHookEffects();

				slowFirstLoad.resolve(createMedia(
					1,
					"Stale media",
				));
				await slowFirstLoad.promise;
				await flushHookEffects();

				expect(mediaInspectionRunner.getMediaInspection).toHaveBeenCalledWith(
					1,
					{ includeEpisodes: false },
				);
				expect(mediaInspectionRunner.getMediaInspection).toHaveBeenCalledWith(
					2,
					{ includeEpisodes: false },
				);
				expect(applyInspectionSnapshot).toHaveBeenCalledTimes(1);
				expect(applyInspectionSnapshot).toHaveBeenCalledWith(expect.objectContaining({
					title: "Fast media",
				}));
			},
		);
	},
);
