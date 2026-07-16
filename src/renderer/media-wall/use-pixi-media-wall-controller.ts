import {
	useCallback,
	useMemo,
} from "react";
import type {
	PixiMediaWallHostProps,
	PixiMediaWallViewModel,
} from "../types/media-wall";
import {
	createScrollMemoryKey,
	MEDIA_WALL_MAX_REQUEST_ITEMS,
} from "./media-wall-host.utils";
import { calculateMediaWallLayout } from "./media-wall-layout";
import { PixiMediaWallRenderer } from "./PixiMediaWallRenderer";
import { usePixiMediaWallActiveState } from "./use-pixi-media-wall-active-state";
import { usePixiMediaWallClickRouting } from "./use-pixi-media-wall-click-routing";
import { usePixiMediaWallControllerRefs } from "./use-pixi-media-wall-controller-refs";
import { usePixiMediaWallDiagnostics } from "./use-pixi-media-wall-diagnostics";
import { usePixiMediaWallInteractionIndexes } from "./use-pixi-media-wall-interaction-indexes";
import { usePixiMediaWallKeyboardNavigation } from "./use-pixi-media-wall-keyboard-navigation";
import { usePixiMediaWallPointerHover } from "./use-pixi-media-wall-pointer-hover";
import { usePixiMediaWallProjectorOverlay } from "./use-pixi-media-wall-projector-overlay";
import { usePixiMediaWallRangeLoader } from "./use-pixi-media-wall-range-loader";
import { usePixiMediaWallRendererLifecycle } from "./use-pixi-media-wall-renderer-lifecycle";
import { usePixiMediaWallScrollRouting } from "./use-pixi-media-wall-scroll-routing";
import { usePixiMediaWallState } from "./use-pixi-media-wall-state";
import { usePixiMediaWallTerminalActions } from "./use-pixi-media-wall-terminal-actions";
import { usePixiMediaWallVisualScrollbar } from "./use-pixi-media-wall-visual-scrollbar";

interface UsePixiMediaWallControllerProps<TItem> extends PixiMediaWallHostProps<TItem> {
	hostStateKey: string;
}

export function usePixiMediaWallController<TItem>({
																										ariaLabel,
																										dataKey,
																										dataSource,
																										search,
																										className,
																										testId,
																										reloadKey,
																										visualStateKey,
																			maximumRequestItems = MEDIA_WALL_MAX_REQUEST_ITEMS,
																										renderer,
																										getItemAriaLabel,
																										getItemSelected,
																										getItemMenuActions,
																										renderProjectorOverlay,
																										onOpenItem,
																										onMenuAction,
																										onSelectionToggle,
																										onWatchStateToggle,
																										onRangeLoaded,
																										onRangeLoadError,
																										diagnosticsMode = "auto",
																										hostStateKey,
																									}: UsePixiMediaWallControllerProps<TItem>): PixiMediaWallViewModel<TItem> {
	const ownedRenderer             = useMemo(
		() => renderer ?? new PixiMediaWallRenderer<TItem>(),
		[ renderer ],
	);
	const createDiagnosticsSnapshot = useCallback(
		() => ownedRenderer.getDiagnostics(),
		[ ownedRenderer ],
	);
	const {
					diagnosticsSnapshot,
					focusedIndex,
					hoveredIndex,
					isDiagnosticsEnabled,
					overlayScrollTop,
					rangeState,
					selectedIndex,
					setDiagnosticsEnabled,
					setDiagnosticsSnapshot,
					setFocusedIndex,
					setHoveredIndex,
					setOverlayScrollTop,
					setRangeState,
					setSelectedIndex,
					setSize,
					size,
				}                         = usePixiMediaWallState<TItem>(
		hostStateKey,
		createDiagnosticsSnapshot,
	);
	const {
					activeIndexRef,
					clearCardActionInteractionRef,
					getItemMenuActionsRef,
					getItemSelectedRef,
					layoutRef,
					onRangeLoadedRef,
					onRangeLoadErrorRef,
					pendingRestoreScrollTopRef,
					pixiLayerRef,
					rangeRef,
					scrollContainerRef,
					scrollTopRef,
					sizeRef,
				}                         = usePixiMediaWallControllerRefs({
		getItemMenuActions,
		getItemSelected,
		onRangeLoaded,
		onRangeLoadError,
		size,
	});
	const {
					actionMenuOpenIndex,
					commitTerminalState,
					executeTerminalAction,
					resetTerminalInteraction,
					runTerminalAction,
					terminalState,
					updateActionMenuOpenIndex,
				}                         = usePixiMediaWallTerminalActions({
		clearCardActionInteractionRef,
		onMenuAction,
		renderer: ownedRenderer,
	});

	const layout          = useMemo(
		() => calculateMediaWallLayout({
			viewportWidth:  size.width,
			viewportHeight: size.height,
			itemCount:      rangeState.total,
		}),
		[
			rangeState.total,
			size.height,
			size.width,
		],
	);
	const {
					handleVisualScrollbarPointerDown,
					handleVisualScrollbarPointerMove,
					handleVisualScrollbarPointerUp,
					hasVerticalOverflow,
					scrollbarThumbHeight,
					scrollbarThumbTop,
					syncVisualScrollbarPosition,
					visualScrollbarRef,
					visualScrollbarThumbRef,
				}               = usePixiMediaWallVisualScrollbar({
		layout,
		layoutRef,
		scrollContainerRef,
		scrollTopRef,
		size,
		sizeRef,
	});
	const {
					handleProjectorOverlayPointerLeave,
					handleProjectorOverlayPointerMove,
					projectorOverlayItem,
					projectorOverlayStyle,
					resetProjectorInteraction,
					updateProjectorHoveredIndex,
				}               = usePixiMediaWallProjectorOverlay({
		layout,
		overlayScrollTop,
		rangeState,
		renderProjectorOverlay,
		renderer: ownedRenderer,
		scrollTopRef,
		setOverlayScrollTop,
		size,
	});
	const scrollMemoryKey = useMemo(
		() => createScrollMemoryKey(
			dataKey,
			search,
		),
		[
			dataKey,
			search,
		],
	);

	usePixiMediaWallDiagnostics({
		diagnosticsMode,
		isDiagnosticsEnabled,
		renderer: ownedRenderer,
		setDiagnosticsEnabled,
		setDiagnosticsSnapshot,
	});

	usePixiMediaWallRendererLifecycle({
		layout,
		layoutRef,
		onRangeLoadErrorRef,
		pixiLayerRef,
		rangeRef,
		renderer: ownedRenderer,
		scrollContainerRef,
		scrollTopRef,
		setSize,
		size,
		sizeRef,
	});

	const { requestVisibleRange } = usePixiMediaWallRangeLoader({
		dataKey,
		dataSource,
		getItemSelected,
		getItemSelectedRef,
		layout,
		layoutRef,
		maximumRequestItems,
		onRangeLoadedRef,
		onRangeLoadErrorRef,
		pendingRestoreScrollTopRef,
		rangeRef,
		rangeState,
		reloadKey,
		renderer: ownedRenderer,
		resetProjectorInteraction,
		resetTerminalInteraction,
		scrollContainerRef,
		scrollMemoryKey,
		scrollTopRef,
		search,
		setFocusedIndex,
		setHoveredIndex,
		setOverlayScrollTop,
		setRangeState,
		setSelectedIndex,
		size,
		sizeRef,
		visualStateKey,
	});

	const {
					clearCardActionInteraction,
					updateFocusedIndex,
					updateHoveredIndex,
				}                               = usePixiMediaWallInteractionIndexes({
		renderer: ownedRenderer,
		scrollTopRef,
		setFocusedIndex,
		setHoveredIndex,
		setOverlayScrollTop,
		updateProjectorHoveredIndex,
	});
	clearCardActionInteractionRef.current = clearCardActionInteraction;

	const handleScroll = usePixiMediaWallScrollRouting({
		activeIndexRef,
		layoutRef,
		pendingRestoreScrollTopRef,
		rangeRef,
		renderer: ownedRenderer,
		requestVisibleRange,
		scrollContainerRef,
		scrollMemoryKey,
		scrollTopRef,
		sizeRef,
		syncVisualScrollbarPosition,
		updateFocusedIndex,
		updateHoveredIndex,
		updateProjectorHoveredIndex,
	});

	const {
					handlePointerLeave,
					handlePointerMove,
				} = usePixiMediaWallPointerHover({
		layoutRef,
		scrollTopRef,
		updateHoveredIndex,
		updateProjectorHoveredIndex,
	});

	const handleClick = usePixiMediaWallClickRouting({
		actionMenuOpenIndex,
		commitTerminalState,
		executeTerminalAction,
		getItemMenuActionsRef,
		hoveredIndex,
		layoutRef,
		onMenuAction,
		onOpenItem,
		onSelectionToggle,
		onWatchStateToggle,
		rangeRef,
		renderer: ownedRenderer,
		runTerminalAction,
		scrollTopRef,
		setOverlayScrollTop,
		setSelectedIndex,
		terminalState,
		updateActionMenuOpenIndex,
	});

	const handleKeyDown = usePixiMediaWallKeyboardNavigation({
		focusedIndex,
		layoutRef,
		onOpenItem,
		onSelectionToggle,
		rangeRef,
		scrollContainerRef,
		scrollTopRef,
		selectedIndex,
		setOverlayScrollTop,
		size,
		updateFocusedIndex,
	});

	const {
					activeAriaLabel,
					activeIndex,
					spacerHeight,
				} = usePixiMediaWallActiveState({
		activeIndexRef,
		actionMenuOpenIndex,
		focusedIndex,
		getItemAriaLabel,
		hoveredIndex,
		layout,
		rangeState,
		selectedIndex,
		viewportHeight: size.height,
	});

	return {
		activeAriaLabel,
		activeIndex,
		ariaLabel,
		className,
		diagnosticsSnapshot,
		getItemAriaLabel,
		handleClick,
		handleKeyDown,
		handlePointerLeave,
		handlePointerMove,
		// The view invokes this from click bubbling: React preserves the child change
		// dispatch, then this full reset prevents the menu from migrating after re-sort.
		handleProjectorOverlayAction: resetProjectorInteraction,
		handleProjectorOverlayPointerLeave,
		handleProjectorOverlayPointerMove,
		handleScroll,
		handleVisualScrollbarPointerDown,
		handleVisualScrollbarPointerMove,
		handleVisualScrollbarPointerUp,
		hasVerticalOverflow,
		hoveredIndex,
		isDiagnosticsEnabled,
		layout,
		pixiLayerRef,
		projectorOverlayItem,
		projectorOverlayStyle,
		rangeState,
		renderProjectorOverlay,
		scrollbarThumbHeight,
		scrollbarThumbTop,
		scrollContainerRef,
		scrollTop: scrollTopRef.current,
		size,
		spacerHeight,
		testId,
		visualScrollbarRef,
		visualScrollbarThumbRef,
	};
}
