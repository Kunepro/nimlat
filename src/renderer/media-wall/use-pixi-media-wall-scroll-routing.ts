import type { RefObject } from "react";
import {
	useCallback,
	useEffect,
	useRef,
} from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
} from "../types/media-wall";
import { rememberScrollTop } from "./media-wall-host.utils";
import { getMediaWallItemViewportPosition } from "./media-wall-layout";

interface UsePixiMediaWallScrollRoutingProps<TItem> {
	activeIndexRef: RefObject<number | null>;
	layoutRef: RefObject<MediaWallLayout | null>;
	pendingRestoreScrollTopRef: RefObject<number | null>;
	rangeRef: RefObject<MediaWallLoadedRange<TItem>>;
	renderer: MediaWallRenderer<TItem>;
	requestVisibleRange: (scrollTop: number) => void;
	scrollContainerRef: RefObject<HTMLDivElement | null>;
	scrollMemoryKey: string;
	scrollTopRef: RefObject<number>;
	sizeRef: RefObject<MediaWallSize>;
	syncVisualScrollbarPosition: (scrollTop: number) => void;
	updateFocusedIndex: (index: number | null) => void;
	updateHoveredIndex: (index: number | null) => void;
	updateProjectorHoveredIndex: (index: number | null) => void;
}

export function usePixiMediaWallScrollRouting<TItem>({
																											 activeIndexRef,
																											 layoutRef,
																											 pendingRestoreScrollTopRef,
																											 rangeRef,
																											 renderer,
																											 requestVisibleRange,
																											 scrollContainerRef,
																											 scrollMemoryKey,
																											 scrollTopRef,
																											 sizeRef,
																											 syncVisualScrollbarPosition,
																											 updateFocusedIndex,
																											 updateHoveredIndex,
																											 updateProjectorHoveredIndex,
																										 }: UsePixiMediaWallScrollRoutingProps<TItem>) {
	const rafRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
		},
		[],
	);

	return useCallback(
		() => {
			const container = scrollContainerRef.current;
			if (!container) {
				return;
			}
			if (
				pendingRestoreScrollTopRef.current !== null
				&& container.scrollTop === 0
				&& rangeRef.current.total === 0
			) {
				return;
			}
			scrollTopRef.current = container.scrollTop;
			rememberScrollTop(
				scrollMemoryKey,
				container.scrollTop,
			);
			// Keep the lightweight thumb transform tied to the native scroll event.
			// Pixi rendering and range requests stay RAF-batched, but delaying the
			// thumb update makes the fixed rail feel disconnected during fast scrolls.
			syncVisualScrollbarPosition(container.scrollTop);
			if (rafRef.current !== null) {
				return;
			}

			rafRef.current = requestAnimationFrame(() => {
				rafRef.current  = null;
				const scrollTop = scrollTopRef.current;
				renderer.setScrollTop(scrollTop);
				renderer.render();
				const currentLayout = layoutRef.current;
				const activeIndex   = activeIndexRef.current;
				if (currentLayout && activeIndex !== null) {
					const position = getMediaWallItemViewportPosition(
						currentLayout,
						activeIndex,
						scrollTop,
					);
					if (!position || position.y + position.height < 0 || position.y > sizeRef.current.height) {
						updateHoveredIndex(null);
						updateFocusedIndex(null);
						updateProjectorHoveredIndex(null);
					}
				}
				requestVisibleRange(scrollTop);
			});
		},
		[
			activeIndexRef,
			layoutRef,
			pendingRestoreScrollTopRef,
			rangeRef,
			renderer,
			requestVisibleRange,
			scrollContainerRef,
			scrollMemoryKey,
			scrollTopRef,
			sizeRef,
			syncVisualScrollbarPosition,
			updateFocusedIndex,
			updateHoveredIndex,
			updateProjectorHoveredIndex,
		],
	);
}
