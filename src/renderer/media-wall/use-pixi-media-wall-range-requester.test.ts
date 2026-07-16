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
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallDataSource,
	MediaWallLoadedRange,
	MediaWallRenderer,
} from "../types/media-wall";
import { calculateMediaWallLayout } from "./media-wall-layout";
import { usePixiMediaWallRangeRequester } from "./use-pixi-media-wall-range-requester";

interface RenderedHook<T> {
	result: { readonly current: T };
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
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

function createDeferred<T>() {
	let resolve: ((value: T) => void) | null      = null;
	let reject: ((error: unknown) => void) | null = null;
	const promise                                 = new Promise<T>((deferredResolve, deferredReject) => {
		resolve = deferredResolve;
		reject  = deferredReject;
	});

	return {
		promise,
		reject:  (error: unknown) => {
			if (!reject) {
				throw new Error("Deferred promise was not initialized.");
			}
			reject(error);
		},
		resolve: (value: T) => {
			if (!resolve) {
				throw new Error("Deferred promise was not initialized.");
			}
			resolve(value);
		},
	};
}

function createRenderer<TItem>(): MediaWallRenderer<TItem> {
	return {
		destroy:                  vi.fn(),
		getDiagnostics:           vi.fn(),
		mount:                    vi.fn(),
		render:                   vi.fn(),
		resize:                   vi.fn(),
		setActionTerminalState:   vi.fn(),
		setDiagnosticsEnabled:    vi.fn(),
		setExitingIndex:          vi.fn(),
		setFocusedIndex:          vi.fn(),
		setHoveredIndex:          vi.fn(),
		setItems:                 vi.fn(),
		setProjectorHoveredIndex: vi.fn(),
		setScrollTop:             vi.fn(),
		setSelectedIndex:         vi.fn(),
		setSelectedIndexes:       vi.fn(),
	} as unknown as MediaWallRenderer<TItem>;
}

async function flushPromises(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await new Promise(resolve => setTimeout(
		resolve,
		0,
	));
}

afterEach(
	() => {
		cleanupRenderedHooks.forEach(cleanup => cleanup());
		cleanupRenderedHooks = [];
		vi.restoreAllMocks();
	},
);

describe(
	"usePixiMediaWallRangeRequester",
	() => {
		it(
			"keeps one pending request across adjacent scroll frames it already covers",
			() => {
				const deferred      = createDeferred<MediaWallLoadedRange<string>>();
				const loadRange     = vi.fn<MediaWallDataSource<string>["loadRange"]>()
					.mockReturnValue(deferred.promise);
				const layout        = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});
				const rangeRef      = {
					current: {
						offset: 0,
						total:  20_000,
						items:  Array.from({ length: 120 }, (_, index) => `${ index }`),
					} satisfies MediaWallLoadedRange<string>,
				};
				const { result } = renderHook(() => usePixiMediaWallRangeRequester({
					dataSource:          { loadRange },
					getItemSelectedRef:  { current: undefined },
					layoutRef:           { current: layout },
					maximumRequestItems: 512,
					onRangeLoadedRef:    { current: undefined },
					onRangeLoadErrorRef: { current: undefined },
					rangeRef,
					renderer:            createRenderer<string>(),
					search:              "",
					setRangeState:       vi.fn(),
				}));

				result.current.requestVisibleRange(layout.contentInsetTop + (layout.rowHeight * 50));
				result.current.requestVisibleRange(layout.contentInsetTop + (layout.rowHeight * 51));

				expect(loadRange).toHaveBeenCalledTimes(1);
				expect(loadRange).toHaveBeenCalledWith({
					offset: (47 * layout.columns) - 120,
					limit:  280,
					search: "",
				});
			},
		);

		it(
			"ignores a superseded range response from the same generation",
			async () => {
				const firstRange: MediaWallLoadedRange<string>   = {
					offset: 0,
					total:  40,
					items:  [ "old" ],
				};
				const currentRange: MediaWallLoadedRange<string> = {
					offset: 10,
					total:  40,
					items:  [ "current" ],
				};
				const firstDeferred                              = createDeferred<MediaWallLoadedRange<string>>();
				const currentDeferred                            = createDeferred<MediaWallLoadedRange<string>>();
				const loadRange                                  = vi.fn<MediaWallDataSource<string>["loadRange"]>()
					.mockReturnValueOnce(firstDeferred.promise)
					.mockReturnValueOnce(currentDeferred.promise);
				const renderer                                   = createRenderer<string>();
				const onRangeLoaded                              = vi.fn();
				const onRangeLoadError                           = vi.fn();
				const setRangeState                              = vi.fn();
				const rangeRef                                   = {
					current: {
										 offset: 0,
										 total:  0,
										 items:  [],
									 } satisfies MediaWallLoadedRange<string>,
				};

				const { result } = renderHook(() => usePixiMediaWallRangeRequester({
					dataSource:          { loadRange },
					getItemSelectedRef:  { current: undefined },
					layoutRef:           { current: null },
					maximumRequestItems: 10,
					onRangeLoadedRef:    { current: onRangeLoaded },
					onRangeLoadErrorRef: { current: onRangeLoadError },
					rangeRef,
					renderer,
					search:              "",
					setRangeState,
				}));

				result.current.requestRange(
					0,
					10,
					0,
				);
				result.current.requestRange(
					10,
					10,
					0,
				);

				firstDeferred.resolve(firstRange);
				await flushPromises();

				expect(renderer.setItems).not.toHaveBeenCalled();
				expect(setRangeState).not.toHaveBeenCalled();
				expect(onRangeLoaded).not.toHaveBeenCalled();

				currentDeferred.resolve(currentRange);
				await flushPromises();

				expect(renderer.setItems).toHaveBeenCalledWith(currentRange);
				expect(setRangeState).toHaveBeenCalledWith(currentRange);
				expect(onRangeLoaded).toHaveBeenCalledWith(currentRange);
				expect(onRangeLoadError).not.toHaveBeenCalled();
			},
		);

		it(
			"ignores a superseded range failure from the same generation",
			async () => {
				const currentRange: MediaWallLoadedRange<string> = {
					offset: 10,
					total:  40,
					items:  [ "current" ],
				};
				const firstDeferred                              = createDeferred<MediaWallLoadedRange<string>>();
				const currentDeferred                            = createDeferred<MediaWallLoadedRange<string>>();
				const loadRange                                  = vi.fn<MediaWallDataSource<string>["loadRange"]>()
					.mockReturnValueOnce(firstDeferred.promise)
					.mockReturnValueOnce(currentDeferred.promise);
				const renderer                                   = createRenderer<string>();
				const onRangeLoaded                              = vi.fn();
				const onRangeLoadError                           = vi.fn();
				const setRangeState                              = vi.fn();
				const rangeRef                                   = {
					current: {
										 offset: 0,
										 total:  0,
										 items:  [],
									 } satisfies MediaWallLoadedRange<string>,
				};

				const { result } = renderHook(() => usePixiMediaWallRangeRequester({
					dataSource:          { loadRange },
					getItemSelectedRef:  { current: undefined },
					layoutRef:           { current: null },
					maximumRequestItems: 10,
					onRangeLoadedRef:    { current: onRangeLoaded },
					onRangeLoadErrorRef: { current: onRangeLoadError },
					rangeRef,
					renderer,
					search:              "",
					setRangeState,
				}));

				result.current.requestRange(
					0,
					10,
					0,
				);
				result.current.requestRange(
					10,
					10,
					0,
				);

				firstDeferred.reject(new Error("stale load failed"));
				await flushPromises();

				expect(onRangeLoadError).not.toHaveBeenCalled();
				expect(renderer.setItems).not.toHaveBeenCalled();

				currentDeferred.resolve(currentRange);
				await flushPromises();

				expect(renderer.setItems).toHaveBeenCalledWith(currentRange);
				expect(setRangeState).toHaveBeenCalledWith(currentRange);
				expect(onRangeLoaded).toHaveBeenCalledWith(currentRange);
				expect(onRangeLoadError).not.toHaveBeenCalled();
			},
		);

		it(
			"ignores a range response that settles after unmount",
			async () => {
				const deferred         = createDeferred<MediaWallLoadedRange<string>>();
				const loadRange        = vi.fn<MediaWallDataSource<string>["loadRange"]>()
					.mockReturnValueOnce(deferred.promise);
				const renderer         = createRenderer<string>();
				const onRangeLoaded    = vi.fn();
				const onRangeLoadError = vi.fn();
				const setRangeState    = vi.fn();
				const rangeRef         = {
					current: {
										 offset: 0,
										 total:  0,
										 items:  [],
									 } satisfies MediaWallLoadedRange<string>,
				};

				const {
								result,
								unmount,
							} = renderHook(() => usePixiMediaWallRangeRequester({
					dataSource:          { loadRange },
					getItemSelectedRef:  { current: undefined },
					layoutRef:           { current: null },
					maximumRequestItems: 10,
					onRangeLoadedRef:    { current: onRangeLoaded },
					onRangeLoadErrorRef: { current: onRangeLoadError },
					rangeRef,
					renderer,
					search:              "",
					setRangeState,
				}));

				result.current.requestRange(
					0,
					10,
					0,
				);
				unmount();
				deferred.resolve({
					offset: 0,
					total:  1,
					items:  [ "late" ],
				});
				await flushPromises();

				expect(renderer.setItems).not.toHaveBeenCalled();
				expect(renderer.render).not.toHaveBeenCalled();
				expect(setRangeState).not.toHaveBeenCalled();
				expect(onRangeLoaded).not.toHaveBeenCalled();
				expect(onRangeLoadError).not.toHaveBeenCalled();
			},
		);
	},
);
