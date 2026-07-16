// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallLoadedRange,
	MediaWallRenderer,
} from "../types/media-wall";
import { calculateMediaWallLayout } from "./media-wall-layout";
import {
	resetMediaWallRangeLoaderForDataGeneration,
	restorePendingMediaWallScrollTopAfterLayout,
} from "./media-wall-range-loader-effects";

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

function createScrollContainer(): HTMLDivElement {
	return {
		scrollTo: vi.fn(),
	} as unknown as HTMLDivElement;
}

describe(
	"media-wall range loader effects",
	() => {
		it(
			"resets stale range and interaction state for a new data generation",
			() => {
				const renderer                                    = createRenderer<string>();
				const previousRange: MediaWallLoadedRange<string> = {
					offset: 10,
					total:  20,
					items:  [ "old" ],
				};
				const emptyRange: MediaWallLoadedRange<string>    = {
					offset: 0,
					total:  0,
					items:  [],
				};
				const rangeRef                                    = { current: previousRange };
				const scrollTopRef                                = { current: 0 };
				const pendingRestore                              = { current: null };
				const scrollContainer                             = createScrollContainer();
				const resetProjectorInteraction                   = vi.fn();
				const resetTerminalInteraction                    = vi.fn();
				const setFocusedIndex                             = vi.fn();
				const setHoveredIndex                             = vi.fn();
				const setOverlayScrollTop                         = vi.fn();
				const setRangeState                               = vi.fn();
				const setSelectedIndex                            = vi.fn();

				resetMediaWallRangeLoaderForDataGeneration({
					emptyRange,
					pendingRestoreScrollTopRef: pendingRestore,
					rangeRef,
					renderer,
					resetProjectorInteraction,
					resetTerminalInteraction,
					restoredScrollTop:          240,
					scrollContainer,
					scrollTopRef,
					setFocusedIndex,
					setHoveredIndex,
					setOverlayScrollTop,
					setRangeState,
					setSelectedIndex,
				});

				expect(rangeRef.current).toBe(emptyRange);
				expect(setRangeState).toHaveBeenCalledWith(emptyRange);
				expect(setHoveredIndex).toHaveBeenCalledWith(null);
				expect(setSelectedIndex).toHaveBeenCalledWith(null);
				expect(setFocusedIndex).toHaveBeenCalledWith(null);
				expect(resetTerminalInteraction).toHaveBeenCalledOnce();
				expect(setOverlayScrollTop).toHaveBeenCalledWith(0);
				expect(resetProjectorInteraction).toHaveBeenCalledOnce();
				expect(pendingRestore.current).toBe(240);
				expect(scrollTopRef.current).toBe(240);
				expect(scrollContainer.scrollTo).toHaveBeenCalledWith({ top: 240 });
				expect(renderer.setItems).toHaveBeenCalledWith(emptyRange);
				expect(renderer.setScrollTop).toHaveBeenCalledWith(240);
				expect(renderer.setHoveredIndex).toHaveBeenCalledWith(null);
				expect(renderer.setExitingIndex).toHaveBeenCalledWith(null);
				expect(renderer.setSelectedIndex).toHaveBeenCalledWith(null);
				expect(renderer.setSelectedIndexes).toHaveBeenCalledWith(new Set());
				expect(renderer.setActionTerminalState).toHaveBeenCalledWith(null);
				expect(renderer.setFocusedIndex).toHaveBeenCalledWith(null);
				expect(renderer.render).toHaveBeenCalledOnce();
			},
		);

		it(
			"does not mark zero scroll as pending restoration",
			() => {
				const renderer                                 = createRenderer<string>();
				const emptyRange: MediaWallLoadedRange<string> = {
					offset: 0,
					total:  0,
					items:  [],
				};
				const pendingRestore                           = { current: 100 };

				resetMediaWallRangeLoaderForDataGeneration({
					emptyRange,
					pendingRestoreScrollTopRef: pendingRestore,
					rangeRef:                   { current: emptyRange },
					renderer,
					resetProjectorInteraction:  vi.fn(),
					resetTerminalInteraction:   vi.fn(),
					restoredScrollTop:          0,
					scrollContainer:            null,
					scrollTopRef:               { current: 100 },
					setFocusedIndex:            vi.fn(),
					setHoveredIndex:            vi.fn(),
					setOverlayScrollTop:        vi.fn(),
					setRangeState:              vi.fn(),
					setSelectedIndex:           vi.fn(),
				});

				expect(pendingRestore.current).toBeNull();
			},
		);

		it(
			"restores pending scroll after layout is tall enough and clamps to the content bounds",
			() => {
				const renderer        = createRenderer<string>();
				const pendingRestore  = { current: 900 };
				const scrollTopRef    = { current: 0 };
				const scrollContainer = createScrollContainer();
				const layout          = calculateMediaWallLayout({
					viewportWidth:  1200,
					viewportHeight: 400,
					itemCount:      200,
				});
				const maxScrollTop    = Math.max(
					0,
					layout.totalHeight - 400,
				);

				const restored = restorePendingMediaWallScrollTopAfterLayout({
					layout,
					pendingRestoreScrollTopRef: pendingRestore,
					renderer,
					scrollContainer,
					scrollTopRef,
					size:                       {
						width:  1200,
						height: 400,
					},
				});

				expect(restored).toBe(true);
				expect(pendingRestore.current).toBeNull();
				expect(scrollTopRef.current).toBe(Math.min(
					900,
					maxScrollTop,
				));
				expect(scrollContainer.scrollTo).toHaveBeenCalledWith({ top: scrollTopRef.current });
				expect(renderer.setScrollTop).toHaveBeenCalledWith(scrollTopRef.current);
				expect(renderer.render).toHaveBeenCalledOnce();
			},
		);

		it(
			"keeps pending scroll untouched until a scroll container and overflowing layout exist",
			() => {
				const renderer       = createRenderer<string>();
				const pendingRestore = { current: 100 };
				const scrollTopRef   = { current: 0 };
				const layout         = calculateMediaWallLayout({
					viewportWidth:  1200,
					viewportHeight: 400,
					itemCount:      1,
				});

				const restored = restorePendingMediaWallScrollTopAfterLayout({
					layout,
					pendingRestoreScrollTopRef: pendingRestore,
					renderer,
					scrollContainer:            null,
					scrollTopRef,
					size:                       {
						width:  1200,
						height: 400,
					},
				});

				expect(restored).toBe(false);
				expect(pendingRestore.current).toBe(100);
				expect(scrollTopRef.current).toBe(0);
				expect(renderer.setScrollTop).not.toHaveBeenCalled();
				expect(renderer.render).not.toHaveBeenCalled();
			},
		);
	},
);
