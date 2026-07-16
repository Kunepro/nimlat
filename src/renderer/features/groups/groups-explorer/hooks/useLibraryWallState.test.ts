// @vitest-environment jsdom

import {
	createElement,
	type ReactElement,
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
import { BACKGROUND_WALL_RELOAD_THROTTLE_MS } from "../library-wall-state-model";
import { useLibraryWallState } from "./useLibraryWallState";

interface RenderedHook<TResult> {
	result: { readonly current: TResult };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<TResult>(useHook: () => TResult): RenderedHook<TResult> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: TResult | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook();
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

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}
				return currentValue;
			},
		},
		unmount,
	};
}

describe(
	"useLibraryWallState",
	() => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.useRealTimers();
		});

		it(
			"updates visible range state and reload keys",
			() => {
				const { result } = renderHook(() => useLibraryWallState());

				flushSync(() => {
					result.current.handleRangeLoaded(12);
				});
				expect(result.current.hasLoadedInitialRange).toBe(true);
				expect(result.current.totalItems).toBe(12);

				flushSync(() => {
					result.current.onVisibleItemsRemoved(5);
				});
				expect(result.current.totalItems).toBe(7);

				flushSync(() => {
					result.current.requestWallReload(
						true,
						true,
					);
				});
				expect(result.current.hasLoadedInitialRange).toBe(false);
				expect(result.current.wallReloadKey).toBe(1);
				expect(result.current.wallResetKey).toBe(1);

				flushSync(() => {
					result.current.handleRangeLoadError(new Error("range failed"));
				});
				expect(result.current.errorMessage).toBe("range failed");

				flushSync(() => {
					result.current.resetVisibleRange();
				});
				expect(result.current.errorMessage).toBeNull();
				expect(result.current.totalItems).toBe(0);
			},
		);

		it(
			"coalesces background wall reloads and clears pending timers on unmount",
			() => {
				const clearTimeoutSpy = vi.spyOn(
					window,
					"clearTimeout",
				);
				const {
								result,
								unmount,
							}               = renderHook(() => useLibraryWallState());

				flushSync(() => {
					result.current.requestBackgroundWallReload();
					result.current.requestBackgroundWallReload();
				});
				expect(result.current.wallReloadKey).toBeUndefined();

				flushSync(() => {
					vi.advanceTimersByTime(BACKGROUND_WALL_RELOAD_THROTTLE_MS);
				});
				expect(result.current.wallReloadKey).toBe(1);

				flushSync(() => {
					result.current.requestBackgroundWallReload();
				});
				unmount();
				expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
			},
		);
	},
);
