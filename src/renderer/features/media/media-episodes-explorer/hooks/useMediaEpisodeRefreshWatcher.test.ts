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
import { useMediaEpisodeRefreshWatcher } from "./useMediaEpisodeRefreshWatcher";

interface RenderedHook<T, P extends object> {
	result: { readonly current: T };
	rerender: (props: P) => void;
	unmount: () => void;
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

describe(
	"useMediaEpisodeRefreshWatcher",
	() => {
		beforeEach(
			() => {
				vi.useFakeTimers();
			},
		);

		afterEach(
			() => {
				cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
				cleanupRenderedHooks = [];
				vi.useRealTimers();
			},
		);

		it(
			"polls while a manual refresh is active and stops when the partial list resolves",
			async () => {
				const refreshMedia = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
				const {
								result,
								rerender,
							}            = renderHook(
					({
						 hasPartialEpisodeList,
						 isEpisodeUpdateActive,
					 }) => useMediaEpisodeRefreshWatcher({
						hasPartialEpisodeList,
						isEpisodeUpdateActive,
						refreshMedia,
					}),
					{
						hasPartialEpisodeList: true,
						isEpisodeUpdateActive: true,
					},
				);

				flushSync(
					() => {
						result.current.handleEpisodeRefreshRequested();
					},
				);

				expect(refreshMedia).toHaveBeenCalledTimes(1);

				await vi.advanceTimersByTimeAsync(1500);

				expect(refreshMedia).toHaveBeenCalledTimes(2);

				rerender({
					hasPartialEpisodeList: false,
					isEpisodeUpdateActive: false,
				});

				await vi.advanceTimersByTimeAsync(3000);

				expect(refreshMedia).toHaveBeenCalledTimes(2);
			},
		);
	},
);
