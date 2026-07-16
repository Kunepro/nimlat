import type {
	PointerEvent,
	RefObject,
} from "react";
import {
	useCallback,
	useRef,
} from "react";
import type {
	MediaWallLayout,
	MediaWallSize,
} from "../types/media-wall";
import {
	clampNumber,
	getVisualScrollbarThumbHeight,
	getVisualScrollbarThumbTop,
	updateVisualScrollbarPosition,
} from "./media-wall-host.utils";

interface ScrollbarDragState {
	pointerId: number;
	thumbOffsetY: number;
}

interface UsePixiMediaWallVisualScrollbarProps {
	layout: MediaWallLayout;
	layoutRef: RefObject<MediaWallLayout | null>;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	scrollTopRef: RefObject<number>;
	size: MediaWallSize;
	sizeRef: RefObject<MediaWallSize>;
}

export function usePixiMediaWallVisualScrollbar({
																									layout,
																									layoutRef,
																									scrollContainerRef,
																									scrollTopRef,
																									size,
																									sizeRef,
																								}: UsePixiMediaWallVisualScrollbarProps): {
	handleVisualScrollbarPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
	handleVisualScrollbarPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
	handleVisualScrollbarPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
	hasVerticalOverflow: boolean;
	scrollbarThumbHeight: number;
	scrollbarThumbTop: number;
	syncVisualScrollbarPosition: (scrollTop: number) => void;
	visualScrollbarRef: RefObject<HTMLDivElement | null>;
	visualScrollbarThumbRef: RefObject<HTMLDivElement | null>;
} {
	const visualScrollbarRef      = useRef<HTMLDivElement | null>(null);
	const visualScrollbarThumbRef = useRef<HTMLDivElement | null>(null);
	const scrollbarDragRef        = useRef<ScrollbarDragState | null>(null);

	const syncVisualScrollbarPosition = useCallback(
		(scrollTop: number) => {
			updateVisualScrollbarPosition(
				scrollTop,
				layoutRef.current,
				sizeRef.current,
				visualScrollbarRef.current,
				visualScrollbarThumbRef.current,
			);
		},
		[
			layoutRef,
			sizeRef,
		],
	);

	const setScrollTopFromVisualScrollbar = useCallback(
		(clientY: number, thumbOffsetY: number) => {
			const currentLayout = layoutRef.current;
			const container     = scrollContainerRef.current;
			const rail          = visualScrollbarRef.current;
			if (!currentLayout || !container || !rail || currentLayout.totalHeight <= sizeRef.current.height) {
				return;
			}

			const railBounds    = rail.getBoundingClientRect();
			const thumbHeight   = getVisualScrollbarThumbHeight(
				currentLayout,
				sizeRef.current,
			);
			const maxThumbTop   = Math.max(
				1,
				sizeRef.current.height - thumbHeight,
			);
			const maxScrollTop  = Math.max(
				1,
				currentLayout.totalHeight - sizeRef.current.height,
			);
			const nextThumbTop  = clampNumber(
				clientY - railBounds.top - thumbOffsetY,
				0,
				maxThumbTop,
			);
			container.scrollTop = (nextThumbTop / maxThumbTop) * maxScrollTop;
		},
		[
			layoutRef,
			scrollContainerRef,
			sizeRef,
		],
	);

	const handleVisualScrollbarPointerDown = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const currentLayout = layoutRef.current;
			const rail          = visualScrollbarRef.current;
			if (!currentLayout || !rail) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.setPointerCapture(event.pointerId);

			const thumbHeight  = getVisualScrollbarThumbHeight(
				currentLayout,
				sizeRef.current,
			);
			const thumbTop     = getVisualScrollbarThumbTop(
				currentLayout,
				sizeRef.current,
				scrollTopRef.current,
			);
			const thumbNode    = visualScrollbarThumbRef.current;
			const targetNode   = event.target;
			const isThumbDrag  = thumbNode && targetNode instanceof Node && thumbNode.contains(targetNode);
			const railBounds   = rail.getBoundingClientRect();
			const thumbOffsetY = isThumbDrag
				? event.clientY - railBounds.top - thumbTop
				: thumbHeight / 2;

			scrollbarDragRef.current = {
				pointerId: event.pointerId,
				thumbOffsetY,
			};
			setScrollTopFromVisualScrollbar(
				event.clientY,
				thumbOffsetY,
			);
		},
		[
			layoutRef,
			scrollTopRef,
			setScrollTopFromVisualScrollbar,
			sizeRef,
		],
	);

	const handleVisualScrollbarPointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const dragState = scrollbarDragRef.current;
			if (!dragState || dragState.pointerId !== event.pointerId) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			setScrollTopFromVisualScrollbar(
				event.clientY,
				dragState.thumbOffsetY,
			);
		},
		[ setScrollTopFromVisualScrollbar ],
	);

	const handleVisualScrollbarPointerUp = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const dragState = scrollbarDragRef.current;
			if (!dragState || dragState.pointerId !== event.pointerId) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			scrollbarDragRef.current = null;
			event.currentTarget.releasePointerCapture(event.pointerId);
		},
		[],
	);

	const hasVerticalOverflow  = layout.totalHeight > size.height + 1;
	const scrollbarThumbHeight = hasVerticalOverflow ? getVisualScrollbarThumbHeight(
		layout,
		size,
	) : 0;
	const scrollbarThumbTop    = hasVerticalOverflow
		? getVisualScrollbarThumbTop(
			layout,
			size,
			scrollTopRef.current,
		)
		: 0;

	return {
		handleVisualScrollbarPointerDown,
		handleVisualScrollbarPointerMove,
		handleVisualScrollbarPointerUp,
		hasVerticalOverflow,
		scrollbarThumbHeight,
		scrollbarThumbTop,
		syncVisualScrollbarPosition,
		visualScrollbarRef,
		visualScrollbarThumbRef,
	};
}
