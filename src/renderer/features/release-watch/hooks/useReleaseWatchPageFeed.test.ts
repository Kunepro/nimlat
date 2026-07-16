// @vitest-environment jsdom

import type { ReleaseWatchScopeFilter } from "@nimlat/types/release-watch";
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
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { RELEASE_WATCH_PAGE_LIMIT } from "../release-watch-model";
import { useReleaseWatchPageFeed } from "./useReleaseWatchPageFeed";

interface RenderedHook<TProps, TResult> {
	result: { readonly current: TResult };
	rerender: (nextProps: TProps) => void;
	unmount: () => void;
}

function createVoidTestStream(): {
	cleanup: ReturnType<typeof vi.fn>;
	emit: () => void;
	stream$: Observable<void>;
} {
	let listener: (() => void) | null = null;
	const cleanup                     = vi.fn();

	return {
		cleanup,
		emit:    () => {
			listener?.();
		},
		stream$: new Observable<void>((subscriber) => {
			listener = () => subscriber.next();
			return cleanup;
		}),
	};
}

interface FeedProps {
	scopeFilter: ReleaseWatchScopeFilter;
}

type FeedRow = number;

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<TProps, TResult>(
	useHook: (props: TProps) => TResult,
	initialProps: TProps,
): RenderedHook<TProps, TResult> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentProps = initialProps;
	let currentValue: TResult | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook(currentProps);
		return null;
	}

	const render = () => {
		flushSync(() => {
			root.render(createElement(HookHost));
		});
	};

	render();

	const rerender = (nextProps: TProps) => {
		currentProps = nextProps;
		render();
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

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}

				return currentValue;
			},
		},
		rerender,
		unmount,
	};
}

async function waitForAssertion(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		try {
			assertion();
			return;
		} catch {
			await new Promise(resolve => setTimeout(
				resolve,
				0,
			));
			await Promise.resolve();
		}
	}

	assertion();
}

describe(
	"useReleaseWatchPageFeed",
	() => {
		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.restoreAllMocks();
		});

		it(
			"loads initial rows, appends later pages, and unsubscribes from list changes",
			async () => {
				const listChangedStream = createVoidTestStream();
				const listPage          = vi.fn((
					scopeFilter: ReleaseWatchScopeFilter,
					limit: number,
					offset: number,
				) => Promise.resolve({
					items:      offset === 0 ? [
						1,
						2,
					] : [ 3 ],
					nextOffset: offset === 0 ? RELEASE_WATCH_PAGE_LIMIT : null,
				}));
				const onLoadError       = vi.fn();
				const onRefreshError    = vi.fn();
				const {
								result,
								unmount,
							}                 = renderHook<FeedProps, ReturnType<typeof useReleaseWatchPageFeed<FeedRow>>>(
					({ scopeFilter }) => useReleaseWatchPageFeed<FeedRow>({
						listPage,
						listChanges: listChangedStream.stream$,
						onLoadError,
						onRefreshError,
						scopeFilter,
					}),
					{ scopeFilter: "tracked" },
				);

				await waitForAssertion(() => {
					expect(result.current.rows).toEqual([
						1,
						2,
					]);
					expect(result.current.nextOffset).toBe(RELEASE_WATCH_PAGE_LIMIT);
				});

				await result.current.loadRows(RELEASE_WATCH_PAGE_LIMIT);
				await waitForAssertion(() => {
					expect(result.current.rows).toEqual([
						1,
						2,
						3,
					]);
					expect(result.current.nextOffset).toBeNull();
				});
				expect(listPage).toHaveBeenCalledWith(
					"tracked",
					RELEASE_WATCH_PAGE_LIMIT,
					0,
				);
				expect(listPage).toHaveBeenCalledWith(
					"tracked",
					RELEASE_WATCH_PAGE_LIMIT,
					RELEASE_WATCH_PAGE_LIMIT,
				);

				listChangedStream.emit();
				await waitForAssertion(() => {
					expect(listPage).toHaveBeenCalledTimes(3);
				});

				unmount();
				expect(listChangedStream.cleanup).toHaveBeenCalledTimes(1);
				expect(onLoadError).not.toHaveBeenCalled();
				expect(onRefreshError).not.toHaveBeenCalled();
			},
		);

		it(
			"routes initial and refresh failures through injected error handlers",
			async () => {
				const listChangedStream = createVoidTestStream();
				const initialError      = new Error("initial failed");
				const refreshError      = new Error("refresh failed");
				const listPage          = vi.fn()
					.mockRejectedValueOnce(initialError)
					.mockRejectedValueOnce(refreshError);
				const onLoadError       = vi.fn();
				const onRefreshError    = vi.fn();
				renderHook<FeedProps, ReturnType<typeof useReleaseWatchPageFeed<FeedRow>>>(
					({ scopeFilter }) => useReleaseWatchPageFeed<FeedRow>({
						listPage,
						listChanges: listChangedStream.stream$,
						onLoadError,
						onRefreshError,
						scopeFilter,
					}),
					{ scopeFilter: "all" },
				);

				await waitForAssertion(() => {
					expect(onLoadError).toHaveBeenCalledWith(initialError);
				});

				listChangedStream.emit();
				await waitForAssertion(() => {
					expect(onRefreshError).toHaveBeenCalledWith(refreshError);
				});
			},
		);
	},
);
