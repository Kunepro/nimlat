import type {
	Dispatch,
	PointerEvent,
	RefObject,
	SetStateAction,
} from "react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallProjectorOverlayItem,
	MediaWallRenderer,
	MediaWallSize,
	PixiMediaWallHostProps,
	PixiMediaWallViewModel,
} from "../types/media-wall";
import {
	resolveMediaWallProjectorOverlayItem,
	resolveMediaWallProjectorOverlayStyle,
} from "./media-wall-projector-overlay-model";

const PROJECTOR_OVERLAY_CLOSE_DELAY_MS = 180;

interface UsePixiMediaWallProjectorOverlayProps<TItem> {
	layout: MediaWallLayout;
	overlayScrollTop: number;
	rangeState: MediaWallLoadedRange<TItem>;
	renderProjectorOverlay?: PixiMediaWallHostProps<TItem>["renderProjectorOverlay"];
	renderer: MediaWallRenderer<TItem>;
	scrollTopRef: RefObject<number>;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	size: MediaWallSize;
}

export function usePixiMediaWallProjectorOverlay<TItem>({
																													layout,
																													overlayScrollTop,
																													rangeState,
																													renderProjectorOverlay,
																													renderer,
																													scrollTopRef,
																													setOverlayScrollTop,
																													size,
																												}: UsePixiMediaWallProjectorOverlayProps<TItem>): {
	handleProjectorOverlayPointerLeave: (event: PointerEvent<HTMLDivElement>) => void;
	handleProjectorOverlayPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
	projectorOverlayItem: MediaWallProjectorOverlayItem<TItem> | null;
	projectorOverlayStyle: PixiMediaWallViewModel<TItem>["projectorOverlayStyle"];
	resetProjectorInteraction: () => void;
	updateProjectorHoveredIndex: (index: number | null) => void;
} {
	const projectorHoveredIndexRef                            = useRef<number | null>(null);
	const projectorPointerIndexRef                            = useRef<number | null>(null);
	const projectorOverlayOpenIndexRef                        = useRef<number | null>(null);
	const projectorOverlayCloseTimeoutRef                     = useRef<number | null>(null);
	const [ projectorOverlayIndex, setProjectorOverlayIndex ] = useState<number | null>(null);

	const clearProjectorOverlayCloseTimer = useCallback(
		() => {
			if (projectorOverlayCloseTimeoutRef.current !== null) {
				window.clearTimeout(projectorOverlayCloseTimeoutRef.current);
				projectorOverlayCloseTimeoutRef.current = null;
			}
		},
		[],
	);

	useEffect(
		() => clearProjectorOverlayCloseTimer,
		[ clearProjectorOverlayCloseTimer ],
	);

	const commitProjectorLightIndex = useCallback(
		(index: number | null) => {
			setProjectorOverlayIndex((current) => current === index ? current : index);
			if (projectorHoveredIndexRef.current === index) {
				return;
			}
			projectorHoveredIndexRef.current = index;
			renderer.setProjectorHoveredIndex(index);
			renderer.render();
		},
		[ renderer ],
	);

	const updateProjectorHoveredIndex = useCallback(
		(index: number | null) => {
			if (index !== null) {
				clearProjectorOverlayCloseTimer();
			}
			projectorPointerIndexRef.current = index;
			commitProjectorLightIndex(projectorOverlayOpenIndexRef.current ?? index);
		},
		[
			clearProjectorOverlayCloseTimer,
			commitProjectorLightIndex,
		],
	);

	const updateProjectorOverlayOpenIndex = useCallback(
		(index: number, open: boolean) => {
			if (open) {
				projectorOverlayOpenIndexRef.current = index;
			} else if (projectorOverlayOpenIndexRef.current === index) {
				projectorOverlayOpenIndexRef.current = null;
			}
			commitProjectorLightIndex(projectorOverlayOpenIndexRef.current ?? projectorPointerIndexRef.current);
		},
		[ commitProjectorLightIndex ],
	);

	const resetProjectorInteraction = useCallback(
		() => {
			clearProjectorOverlayCloseTimer();
			projectorHoveredIndexRef.current     = null;
			projectorPointerIndexRef.current     = null;
			projectorOverlayOpenIndexRef.current = null;
			setProjectorOverlayIndex(null);
			renderer.setProjectorHoveredIndex(null);
			renderer.render();
		},
		[
			clearProjectorOverlayCloseTimer,
			renderer,
		],
	);

	const handleProjectorOverlayPointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			event.stopPropagation();
			if (projectorOverlayIndex !== null) {
				setOverlayScrollTop((current) => current === scrollTopRef.current ? current : scrollTopRef.current);
				updateProjectorHoveredIndex(projectorOverlayIndex);
			}
		},
		[
			projectorOverlayIndex,
			scrollTopRef,
			setOverlayScrollTop,
			updateProjectorHoveredIndex,
		],
	);

	const handleProjectorOverlayPointerLeave = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			event.stopPropagation();
			clearProjectorOverlayCloseTimer();
			// The tracking controls float above the projector plaque; this small grace period
			// keeps the real UX component reachable when the pointer crosses sub-pixel gaps.
			projectorOverlayCloseTimeoutRef.current = window.setTimeout(
				() => {
					projectorOverlayCloseTimeoutRef.current = null;
					updateProjectorHoveredIndex(null);
				},
				PROJECTOR_OVERLAY_CLOSE_DELAY_MS,
			);
		},
		[
			clearProjectorOverlayCloseTimer,
			updateProjectorHoveredIndex,
		],
	);

	const projectorOverlayItem = useMemo<MediaWallProjectorOverlayItem<TItem> | null>(
		() => resolveMediaWallProjectorOverlayItem({
			hasProjectorOverlayRenderer:  Boolean(renderProjectorOverlay),
			layout,
			onProjectorOverlayOpenChange: updateProjectorOverlayOpenIndex,
			overlayScrollTop,
			projectorOverlayIndex,
			rangeState,
			size,
		}),
		[
			layout,
			overlayScrollTop,
			projectorOverlayIndex,
			rangeState,
			renderProjectorOverlay,
			size,
			updateProjectorOverlayOpenIndex,
		],
	);

	const projectorOverlayStyle: PixiMediaWallViewModel<TItem>["projectorOverlayStyle"] = resolveMediaWallProjectorOverlayStyle(projectorOverlayItem);

	return {
		handleProjectorOverlayPointerLeave,
		handleProjectorOverlayPointerMove,
		projectorOverlayItem,
		projectorOverlayStyle,
		resetProjectorInteraction,
		updateProjectorHoveredIndex,
	};
}
