import type {
	PointerEvent,
	RefObject,
} from "react";
import { useCallback } from "react";
import type { MediaWallLayout } from "../types/media-wall";
import { getProjectorHoveredIndex } from "./media-wall-hit-testing";
import { hitTestMediaWall } from "./media-wall-layout";

interface UsePixiMediaWallPointerHoverProps {
	layoutRef: RefObject<MediaWallLayout | null>;
	scrollTopRef: RefObject<number>;
	updateHoveredIndex: (index: number | null) => void;
	updateProjectorHoveredIndex: (index: number | null) => void;
}

export function usePixiMediaWallPointerHover({
																							 layoutRef,
																							 scrollTopRef,
																							 updateHoveredIndex,
																							 updateProjectorHoveredIndex,
																						 }: UsePixiMediaWallPointerHoverProps): {
	handlePointerLeave: (event: PointerEvent<HTMLDivElement>) => void;
	handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
} {
	const handlePointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const currentLayout = layoutRef.current;
			if (!currentLayout) {
				updateHoveredIndex(null);
				updateProjectorHoveredIndex(null);
				return;
			}
			const bounds = event.currentTarget.getBoundingClientRect();
			const point  = {
				x: event.clientX - bounds.left,
				y: event.clientY - bounds.top,
			};
			const hit    = hitTestMediaWall(
				currentLayout,
				point,
				scrollTopRef.current,
			);
			updateHoveredIndex(hit);
			updateProjectorHoveredIndex(getProjectorHoveredIndex(
				currentLayout,
				point,
				scrollTopRef.current,
			));
		},
		[
			layoutRef,
			scrollTopRef,
			updateHoveredIndex,
			updateProjectorHoveredIndex,
		],
	);

	const handlePointerLeave = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest("[data-media-wall-projector-overlay='true']")) {
				return;
			}
			updateHoveredIndex(null);
			updateProjectorHoveredIndex(null);
		},
		[
			updateHoveredIndex,
			updateProjectorHoveredIndex,
		],
	);

	return {
		handlePointerLeave,
		handlePointerMove,
	};
}
