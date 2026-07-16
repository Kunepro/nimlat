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
	MediaWallSize,
} from "../types/media-wall";
import {
	rememberScrollTop,
	resolveInitialRequest,
} from "./media-wall-host.utils";
import { startMediaWallRangeLoaderGeneration } from "./media-wall-range-loader-generation";

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
	"media-wall range loader generation",
	() => {
		it(
			"resets index-owned state and requests the remembered viewport for a new generation",
			() => {
				const scrollMemoryKey                             = "range-loader-generation:remembered";
				const rememberedScrollTop                         = 480;
				const size: MediaWallSize                         = {
					width:  1280,
					height: 720,
				};
				const previousRange: MediaWallLoadedRange<string> = {
					offset: 120,
					total:  1_000,
					items:  [ "old" ],
				};
				const renderer                                    = createRenderer<string>();
				const scrollContainer                             = createScrollContainer();
				const requestRange                                = vi.fn();
				const resetProjectorInteraction                   = vi.fn();
				const resetTerminalInteraction                    = vi.fn();
				const setFocusedIndex                             = vi.fn();
				const setHoveredIndex                             = vi.fn();
				const setOverlayScrollTop                         = vi.fn();
				const setRangeState                               = vi.fn();
				const setSelectedIndex                            = vi.fn();
				const rangeRef                                    = { current: previousRange };
				const pendingRestoreScrollTopRef                  = { current: null };
				const scrollTopRef                                = { current: 0 };

				rememberScrollTop(
					scrollMemoryKey,
					rememberedScrollTop,
				);

				const result          = startMediaWallRangeLoaderGeneration({
					beginNextGeneration: () => 7,
					maximumRequestItems: 512,
					pendingRestoreScrollTopRef,
					rangeRef,
					renderer,
					requestRange,
					resetProjectorInteraction,
					resetTerminalInteraction,
					scrollContainer,
					scrollMemoryKey,
					scrollTopRef,
					setFocusedIndex,
					setHoveredIndex,
					setOverlayScrollTop,
					setRangeState,
					setSelectedIndex,
					size,
				});
				const expectedRequest = resolveInitialRequest(
					size,
					rememberedScrollTop,
					512,
				);

				expect(result).toEqual({
					generation:        7,
					initialRequest:    expectedRequest,
					restoredScrollTop: rememberedScrollTop,
				});
				expect(rangeRef.current).toEqual({
					offset: 0,
					total:  0,
					items:  [],
				});
				expect(pendingRestoreScrollTopRef.current).toBe(rememberedScrollTop);
				expect(scrollTopRef.current).toBe(rememberedScrollTop);
				expect(scrollContainer.scrollTo).toHaveBeenCalledWith({ top: rememberedScrollTop });
				expect(resetProjectorInteraction).toHaveBeenCalledOnce();
				expect(resetTerminalInteraction).toHaveBeenCalledOnce();
				expect(setFocusedIndex).toHaveBeenCalledWith(null);
				expect(setHoveredIndex).toHaveBeenCalledWith(null);
				expect(setOverlayScrollTop).toHaveBeenCalledWith(0);
				expect(setSelectedIndex).toHaveBeenCalledWith(null);
				expect(renderer.setScrollTop).toHaveBeenCalledWith(rememberedScrollTop);
				expect(requestRange).toHaveBeenCalledWith(
					expectedRequest.offset,
					expectedRequest.limit,
					7,
				);
			},
		);

		it(
			"requests the first page when no scroll position is remembered",
			() => {
				const requestRange                                = vi.fn();
				const pendingRestoreScrollTopRef                  = { current: 120 };
				const scrollTopRef                                = { current: 120 };
				const previousRange: MediaWallLoadedRange<string> = {
					offset: 10,
					total:  20,
					items:  [ "old" ],
				};

				const result = startMediaWallRangeLoaderGeneration({
					beginNextGeneration:       () => 3,
					maximumRequestItems:       512,
					pendingRestoreScrollTopRef,
					rangeRef:                  { current: previousRange },
					renderer:                  createRenderer<string>(),
					requestRange,
					resetProjectorInteraction: vi.fn(),
					resetTerminalInteraction:  vi.fn(),
					scrollContainer:           null,
					scrollMemoryKey:           "range-loader-generation:no-memory",
					scrollTopRef,
					setFocusedIndex:           vi.fn(),
					setHoveredIndex:           vi.fn(),
					setOverlayScrollTop:       vi.fn(),
					setRangeState:             vi.fn(),
					setSelectedIndex:          vi.fn(),
					size:                      {
						width:  800,
						height: 480,
					},
				});

				expect(result).toEqual({
					generation:        3,
					initialRequest:    {
						offset: 0,
						limit:  106,
					},
					restoredScrollTop: 0,
				});
				expect(pendingRestoreScrollTopRef.current).toBeNull();
				expect(scrollTopRef.current).toBe(0);
				expect(requestRange).toHaveBeenCalledWith(
					0,
					106,
					3,
				);
			},
		);
	},
);
