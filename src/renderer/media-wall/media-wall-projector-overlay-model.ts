import type {
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallProjectorOverlayItem,
	MediaWallSize,
	PixiMediaWallViewModel,
} from "../types/media-wall";
import {
	getProjectorTrackingMenuOffset,
	PROJECTOR_TRACKING_MENU_WIDTH,
} from "./media-wall-hit-testing";
import { getRangeItem } from "./media-wall-host.utils";
import { getMediaWallItemViewportPosition } from "./media-wall-layout";

export interface ResolveMediaWallProjectorOverlayItemOptions<TItem> {
	readonly hasProjectorOverlayRenderer: boolean;
	readonly layout: MediaWallLayout;
	readonly onProjectorOverlayOpenChange: (index: number, open: boolean) => void;
	readonly overlayScrollTop: number;
	readonly projectorOverlayIndex: number | null;
	readonly rangeState: MediaWallLoadedRange<TItem>;
	readonly size: MediaWallSize;
}

// Resolves the DOM overlay projection for a Pixi card without React state.
// The hook owns hover/timer side effects; this function owns bounded viewport
// and range checks so overlay visibility stays deterministic and testable.
export function resolveMediaWallProjectorOverlayItem<TItem>({
																															hasProjectorOverlayRenderer,
																															layout,
																															onProjectorOverlayOpenChange,
																															overlayScrollTop,
																															projectorOverlayIndex,
																															rangeState,
																															size,
																														}: ResolveMediaWallProjectorOverlayItemOptions<TItem>): MediaWallProjectorOverlayItem<TItem> | null {
	if (projectorOverlayIndex === null || !hasProjectorOverlayRenderer) {
		return null;
	}
	const item = getRangeItem(
		rangeState,
		projectorOverlayIndex,
	);
	if (!item) {
		return null;
	}
	const position = getMediaWallItemViewportPosition(
		layout,
		projectorOverlayIndex,
		overlayScrollTop,
	);
	if (!position || position.y + position.height < 0 || position.y > size.height) {
		return null;
	}

	return {
		height:                       position.height,
		index:                        projectorOverlayIndex,
		item,
		trackingMenuOffsetPx:         getProjectorTrackingMenuOffset(
			position,
			size.width,
		),
		width:                        position.width,
		x:                            position.x,
		y:                            position.y,
		onProjectorOverlayOpenChange: (open: boolean) => {
			onProjectorOverlayOpenChange(
				projectorOverlayIndex,
				open,
			);
		},
	};
}

export function resolveMediaWallProjectorOverlayStyle<TItem>(
	projectorOverlayItem: MediaWallProjectorOverlayItem<TItem> | null,
): PixiMediaWallViewModel<TItem>["projectorOverlayStyle"] {
	return projectorOverlayItem
		? {
			display:                            "block",
			height:                             projectorOverlayItem.height,
			transform:                          `translate(${ Math.round(projectorOverlayItem.x) }px, ${ Math.round(projectorOverlayItem.y) }px)`,
			width:                              projectorOverlayItem.width,
			"--projector-tracking-menu-offset": `${ projectorOverlayItem.trackingMenuOffsetPx }px`,
			"--projector-tracking-menu-width":  `${ PROJECTOR_TRACKING_MENU_WIDTH }px`,
		}
		: undefined;
}
