import type {
	Dispatch,
	KeyboardEvent,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallSize,
	PixiMediaWallHostProps,
} from "../types/media-wall";
import {
	clampIndex,
	getRangeItem,
} from "./media-wall-host.utils";
import { getMediaWallItemViewportPosition } from "./media-wall-layout";

interface MediaWallControllerRef<TValue> {
	current: TValue;
}

interface UsePixiMediaWallKeyboardNavigationProps<TItem> {
	focusedIndex: number | null;
	layoutRef: MediaWallControllerRef<MediaWallLayout | null>;
	onOpenItem: PixiMediaWallHostProps<TItem>["onOpenItem"];
	onSelectionToggle: PixiMediaWallHostProps<TItem>["onSelectionToggle"];
	rangeRef: MediaWallControllerRef<MediaWallLoadedRange<TItem>>;
	scrollContainerRef: MediaWallControllerRef<HTMLDivElement | null>;
	scrollTopRef: MediaWallControllerRef<number>;
	selectedIndex: number | null;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	size: MediaWallSize;
	updateFocusedIndex: (index: number | null) => void;
}

export function usePixiMediaWallKeyboardNavigation<TItem>({
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
																													}: UsePixiMediaWallKeyboardNavigationProps<TItem>) {
	return useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			const currentLayout = layoutRef.current;
			if (!currentLayout || currentLayout.itemCount <= 0) {
				return;
			}
			const current = focusedIndex ?? selectedIndex ?? 0;
			const columns = currentLayout.columns;
			// Keyboard focus is renderer-owned state, so this hook only computes intent and asks the
			// controller to commit the selected index/render side effects through updateFocusedIndex.
			const movementByKey: Partial<Record<string, number>> = {
				ArrowLeft:  -1,
				ArrowRight: 1,
				ArrowUp:    -columns,
				ArrowDown:  columns,
				Home:       -current,
				End:        currentLayout.itemCount - 1 - current,
			};
			const movement                                       = movementByKey[ event.key ];
			if (typeof movement === "number") {
				event.preventDefault();
				const next = clampIndex(
					current + movement,
					currentLayout.itemCount,
				);
				updateFocusedIndex(next);
				if (next !== null) {
					setOverlayScrollTop(scrollTopRef.current);
					const position = getMediaWallItemViewportPosition(
						currentLayout,
						next,
						scrollTopRef.current,
					);
					if (position && (position.y < 0 || position.y + position.height > size.height)) {
						const row       = Math.floor(next / currentLayout.columns);
						const scrollTop = Math.max(
							0,
							row * currentLayout.rowHeight,
						);
						scrollContainerRef.current?.scrollTo({ top: scrollTop });
					}
				}
				return;
			}

			if (event.key === "Enter" && focusedIndex !== null) {
				const item = getRangeItem(
					rangeRef.current,
					focusedIndex,
				);
				if (item && onOpenItem) {
					event.preventDefault();
					onOpenItem(
						item,
						focusedIndex,
					);
				}
			}

			if (event.key === " " && focusedIndex !== null) {
				const item = getRangeItem(
					rangeRef.current,
					focusedIndex,
				);
				if (item && onSelectionToggle) {
					event.preventDefault();
					onSelectionToggle(
						item,
						focusedIndex,
					);
				}
			}
		},
		[
			focusedIndex,
			layoutRef,
			onOpenItem,
			onSelectionToggle,
			rangeRef,
			scrollContainerRef,
			scrollTopRef,
			selectedIndex,
			setOverlayScrollTop,
			size.height,
			updateFocusedIndex,
		],
	);
}
