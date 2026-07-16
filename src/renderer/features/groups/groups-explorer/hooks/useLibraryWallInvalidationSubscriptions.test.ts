// @vitest-environment jsdom

import type {
	GroupListChangedEvent,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
} from "@nimlat/types/ipc-payloads";
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
import { useLibraryWallInvalidationSubscriptions } from "./useLibraryWallInvalidationSubscriptions";

const libraryWallRunner = vi.hoisted(() => ({
	libraryGroupListChanges:              vi.fn<() => Observable<GroupListChangedEvent>>(),
	libraryGroupMediaItemsPatched:        vi.fn<() => Observable<GroupMediaItemsPatchedEvent>>(),
	libraryGroupMediaListChanges:         vi.fn<() => Observable<GroupMediaListChangedEvent>>(),
	libraryPreferredTitleLanguageChanges: vi.fn<() => Observable<PreferredTitleLanguage>>(),
}));

vi.mock(
	"../library-wall-invalidation-runner",
	() => ({
		libraryGroupListChanges:              libraryWallRunner.libraryGroupListChanges,
		libraryGroupMediaItemsPatched:        libraryWallRunner.libraryGroupMediaItemsPatched,
		libraryGroupMediaListChanges:         libraryWallRunner.libraryGroupMediaListChanges,
		libraryPreferredTitleLanguageChanges: libraryWallRunner.libraryPreferredTitleLanguageChanges,
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
let groupListStream: TestStream<GroupListChangedEvent>;
let groupMediaListStream: TestStream<GroupMediaListChangedEvent>;
let groupMediaPatchStream: TestStream<GroupMediaItemsPatchedEvent>;
let titleLanguageStream: TestStream<PreferredTitleLanguage>;

function createTestStream<TEvent>(): TestStream<TEvent> {
	let listener: ((event: TEvent) => void) | null = null;
	const cleanup                                  = vi.fn();

	return {
		cleanup,
		emit:    (event: TEvent) => {
			if (!listener) {
				throw new Error("Library wall invalidation stream emitted before subscription.");
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
	"useLibraryWallInvalidationSubscriptions",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			groupListStream       = createTestStream<GroupListChangedEvent>();
			groupMediaListStream  = createTestStream<GroupMediaListChangedEvent>();
			groupMediaPatchStream = createTestStream<GroupMediaItemsPatchedEvent>();
			titleLanguageStream   = createTestStream<PreferredTitleLanguage>();
			libraryWallRunner.libraryGroupListChanges.mockReturnValue(groupListStream.stream$);
			libraryWallRunner.libraryGroupMediaListChanges.mockReturnValue(groupMediaListStream.stream$);
			libraryWallRunner.libraryGroupMediaItemsPatched.mockReturnValue(groupMediaPatchStream.stream$);
			libraryWallRunner.libraryPreferredTitleLanguageChanges.mockReturnValue(titleLanguageStream.stream$);
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanup => cleanup());
			cleanupRenderedHooks = [];
		});

		it(
			"routes grouping events to background reloads and title language events to direct reloads",
			() => {
				const requestBackgroundWallReload = vi.fn();
				const requestWallReload           = vi.fn();

				renderHook(() => useLibraryWallInvalidationSubscriptions({
					requestBackgroundWallReload,
					requestWallReload,
				}));

				flushSync(() => {
					groupListStream.emit({});
					groupMediaListStream.emit({ affectedMediaIds: [ 1 ] });
					groupMediaPatchStream.emit({ patches: [ { mediaId: 1 } ] });
					titleLanguageStream.emit("native");
				});

				expect(requestBackgroundWallReload).toHaveBeenCalledTimes(3);
				expect(requestWallReload).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"unsubscribes all invalidation streams on unmount",
			() => {
				const renderedHook = renderHook(() => useLibraryWallInvalidationSubscriptions({
					requestBackgroundWallReload: vi.fn(),
					requestWallReload:           vi.fn(),
				}));

				renderedHook.unmount();

				expect(groupListStream.cleanup).toHaveBeenCalledTimes(1);
				expect(groupMediaListStream.cleanup).toHaveBeenCalledTimes(1);
				expect(groupMediaPatchStream.cleanup).toHaveBeenCalledTimes(1);
				expect(titleLanguageStream.cleanup).toHaveBeenCalledTimes(1);
			},
		);
	},
);
