import type {
	Dispatch,
	RefObject,
	SetStateAction,
} from "react";
import { useCallback } from "react";
import type { MediaWallRenderer } from "../types/media-wall";

interface UsePixiMediaWallInteractionIndexesOptions<TItem> {
	renderer: MediaWallRenderer<TItem>;
	scrollTopRef: RefObject<number>;
	setFocusedIndex: Dispatch<SetStateAction<number | null>>;
	setHoveredIndex: Dispatch<SetStateAction<number | null>>;
	setOverlayScrollTop: Dispatch<SetStateAction<number>>;
	updateProjectorHoveredIndex: (index: number | null) => void;
}

interface PixiMediaWallInteractionIndexes {
	clearCardActionInteraction: () => void;
	updateFocusedIndex: (index: number | null) => void;
	updateHoveredIndex: (index: number | null) => void;
}

// Hover/focus changes are mirrored into Pixi immediately. Keeping the renderer
// mutation in one hook prevents pointer, keyboard, and scroll paths from drifting.
export function usePixiMediaWallInteractionIndexes<TItem>({
																														renderer,
																														scrollTopRef,
																														setFocusedIndex,
																														setHoveredIndex,
																														setOverlayScrollTop,
																														updateProjectorHoveredIndex,
																													}: UsePixiMediaWallInteractionIndexesOptions<TItem>): PixiMediaWallInteractionIndexes {
	const updateHoveredIndex = useCallback(
		(index: number | null) => {
			setOverlayScrollTop((current) => current === scrollTopRef.current ? current : scrollTopRef.current);
			setHoveredIndex((current) => {
				if (current === index) {
					return current;
				}
				renderer.setHoveredIndex(index);
				renderer.render();
				return index;
			});
		},
		[
			renderer,
			scrollTopRef,
			setHoveredIndex,
			setOverlayScrollTop,
		],
	);

	const updateFocusedIndex = useCallback(
		(index: number | null) => {
			setOverlayScrollTop((current) => current === scrollTopRef.current ? current : scrollTopRef.current);
			setFocusedIndex((current) => {
				if (current === index) {
					return current;
				}
				renderer.setFocusedIndex(index);
				renderer.render();
				return index;
			});
		},
		[
			renderer,
			scrollTopRef,
			setFocusedIndex,
			setOverlayScrollTop,
		],
	);

	const clearCardActionInteraction = useCallback(
		() => {
			updateHoveredIndex(null);
			updateProjectorHoveredIndex(null);
			updateFocusedIndex(null);
		},
		[
			updateFocusedIndex,
			updateHoveredIndex,
			updateProjectorHoveredIndex,
		],
	);

	return {
		clearCardActionInteraction,
		updateFocusedIndex,
		updateHoveredIndex,
	};
}
