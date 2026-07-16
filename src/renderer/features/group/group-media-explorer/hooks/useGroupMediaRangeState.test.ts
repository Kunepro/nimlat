// @vitest-environment jsdom

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
} from "vitest";
import { useGroupMediaRangeState } from "./useGroupMediaRangeState";

let cleanup: (() => void) | null = null;

function renderRangeStateHook() {
	const container                                                = document.createElement("div");
	const root: Root                                               = createRoot(container);
	let current: ReturnType<typeof useGroupMediaRangeState> | null = null;

	function HookHost(): ReactElement | null {
		current = useGroupMediaRangeState();
		return null;
	}

	flushSync(() => root.render(createElement(HookHost)));
	cleanup = () => flushSync(() => root.unmount());

	return {
		get current() {
			if (!current) {
				throw new Error("Range-state hook did not render.");
			}
			return current;
		},
	};
}

describe(
	"useGroupMediaRangeState",
	() => {
		afterEach(() => {
			cleanup?.();
			cleanup = null;
		});

		it(
			"tracks only the currently loaded media ids and clears them with the routed range",
			() => {
				const result = renderRangeStateHook();

				flushSync(() => result.current.handleRangeLoaded({
					offset: 4,
					total:  20,
					items:  [
						{
							mediaId:     9,
							name:        "Visible media",
							isWatched:   false,
							lastRefresh: "",
							isFilm:      false,
						},
					],
				}));

				expect(result.current.totalMediaItems).toBe(20);
				expect(result.current.loadedMediaIds).toEqual(new Set([ 9 ]));

				flushSync(() => result.current.resetMediaRange());

				expect(result.current.loadedMediaIds.size).toBe(0);
			},
		);
	},
);
