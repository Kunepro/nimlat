// @vitest-environment jsdom

import type {
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { PreferredTitleLanguage } from "@nimlat/types/user-config";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import {
	createRoot,
	type Root,
} from "react-dom/client";
import { Observable } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useGroupMediaSubscriptions } from "./useGroupMediaSubscriptions";

const groupMediaSubscriptionsRunner = vi.hoisted(() => ({
	groupMediaItemsPatched:                  vi.fn<() => Observable<GroupMediaItemsPatchedEvent>>(),
	groupMediaListChanges:                   vi.fn<() => Observable<GroupMediaListChangedEvent>>(),
	groupMediaPreferredTitleLanguageChanges: vi.fn<() => Observable<PreferredTitleLanguage>>(),
}));

vi.mock(
	"../group-media-subscriptions-runner",
	() => ({
		groupMediaItemsPatched:                  groupMediaSubscriptionsRunner.groupMediaItemsPatched,
		groupMediaListChanges:                   groupMediaSubscriptionsRunner.groupMediaListChanges,
		groupMediaPreferredTitleLanguageChanges: groupMediaSubscriptionsRunner.groupMediaPreferredTitleLanguageChanges,
	}),
);

interface TestStream<TEvent> {
	cleanup: ReturnType<typeof vi.fn>;
	emit: (event: TEvent) => void;
	stream$: Observable<TEvent>;
}

interface RenderedHook {
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];
let listStream: TestStream<GroupMediaListChangedEvent>;
let patchStream: TestStream<GroupMediaItemsPatchedEvent>;
let titleLanguageStream: TestStream<PreferredTitleLanguage>;

function createTestStream<TEvent>(): TestStream<TEvent> {
	let listener: ((event: TEvent) => void) | null = null;
	const cleanup                                  = vi.fn();

	return {
		cleanup,
		emit:    (event: TEvent) => {
			if (!listener) {
				throw new Error("Group media subscription stream emitted before subscription.");
			}
			listener(event);
		},
		stream$: new Observable<TEvent>((subscriber) => {
			listener = event => subscriber.next(event);
			return cleanup;
		}),
	};
}

function renderHook(useHook: () => void): RenderedHook {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		useHook();
		return null;
	}

	flushSync(() => {
		root.render(createElement(HookHost));
	});

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

	return { unmount };
}

describe(
	"useGroupMediaSubscriptions",
	() => {
		const activeGroupRef: GroupRef = {
			source:  "user",
			groupId: 3,
		};
		const otherGroupRef: GroupRef  = {
			source:  "official",
			groupId: 3,
		};

		beforeEach(() => {
			vi.clearAllMocks();
			listStream          = createTestStream<GroupMediaListChangedEvent>();
			patchStream         = createTestStream<GroupMediaItemsPatchedEvent>();
			titleLanguageStream = createTestStream<PreferredTitleLanguage>();
			groupMediaSubscriptionsRunner.groupMediaListChanges.mockReturnValue(listStream.stream$);
			groupMediaSubscriptionsRunner.groupMediaItemsPatched.mockReturnValue(patchStream.stream$);
			groupMediaSubscriptionsRunner.groupMediaPreferredTitleLanguageChanges.mockReturnValue(titleLanguageStream.stream$);
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanup => cleanup());
			cleanupRenderedHooks = [];
		});

		it(
			"routes only active group media events into summary reloads, wall reloads, and selected media patches",
			() => {
				const loadSummary         = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				const applyWatchStatePatches = vi.fn();
				const patchSelectedMedias = vi.fn();
				const requestWallReload   = vi.fn();

				renderHook(() => useGroupMediaSubscriptions({
					applyWatchStatePatches,
					groupRef: activeGroupRef,
					loadedMediaIds: new Set([ 9 ]),
					loadSummary,
					patchSelectedMedias,
					requestWallReload,
				}));

				flushSync(() => {
					listStream.emit({
						groups:           [ otherGroupRef ],
						affectedMediaIds: [ 8 ],
					});
					patchStream.emit({
						group:   otherGroupRef,
						patches: [ { mediaId: 8 } ],
					});
				});

				expect(loadSummary).not.toHaveBeenCalled();
				expect(applyWatchStatePatches).not.toHaveBeenCalled();
				expect(patchSelectedMedias).not.toHaveBeenCalled();
				expect(requestWallReload).not.toHaveBeenCalled();

				const patch = {
					mediaId:   9,
					isWatched: true,
				};
				const offscreenPatch         = {
					mediaId:   10,
					isWatched: true,
				};

				flushSync(() => {
					listStream.emit({
						groups:           [ activeGroupRef ],
						affectedMediaIds: [ 9 ],
					});
					patchStream.emit({
						group:   activeGroupRef,
						patches: [
							patch,
							offscreenPatch,
						],
					});
					titleLanguageStream.emit("native");
				});

				expect(loadSummary).toHaveBeenCalledTimes(2);
				expect(loadSummary).toHaveBeenNthCalledWith(
					1,
					false,
				);
				expect(loadSummary).toHaveBeenNthCalledWith(
					2,
					false,
				);
				expect(patchSelectedMedias).toHaveBeenCalledTimes(1);
				expect(patchSelectedMedias).toHaveBeenCalledWith([
					patch,
					offscreenPatch,
				]);
				expect(applyWatchStatePatches).toHaveBeenCalledTimes(1);
				expect(applyWatchStatePatches).toHaveBeenCalledWith([ patch ]);
				expect(requestWallReload).toHaveBeenCalledTimes(3);
			},
		);

		it(
			"does not subscribe before the routed group is resolved",
			() => {
				renderHook(() => useGroupMediaSubscriptions({
					applyWatchStatePatches: vi.fn(),
					groupRef:            null,
					loadedMediaIds:         new Set(),
					loadSummary:         vi.fn(),
					patchSelectedMedias: vi.fn(),
					requestWallReload:   vi.fn(),
				}));

				expect(groupMediaSubscriptionsRunner.groupMediaListChanges).not.toHaveBeenCalled();
				expect(groupMediaSubscriptionsRunner.groupMediaItemsPatched).not.toHaveBeenCalled();
				expect(groupMediaSubscriptionsRunner.groupMediaPreferredTitleLanguageChanges).not.toHaveBeenCalled();
			},
		);

		it(
			"unsubscribes all active group media streams on unmount",
			() => {
				const renderedHook = renderHook(() => useGroupMediaSubscriptions({
					applyWatchStatePatches: vi.fn(),
					groupRef:            activeGroupRef,
					loadedMediaIds:         new Set(),
					loadSummary:         vi.fn(),
					patchSelectedMedias: vi.fn(),
					requestWallReload:   vi.fn(),
				}));

				renderedHook.unmount();

				expect(listStream.cleanup).toHaveBeenCalledTimes(1);
				expect(patchStream.cleanup).toHaveBeenCalledTimes(1);
				expect(titleLanguageStream.cleanup).toHaveBeenCalledTimes(1);
			},
		);
	},
);
