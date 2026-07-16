import type { MediaWallItemViewportPosition } from "../types/media-wall";
import { getPosterBounds } from "./pixi-card-geometry";

export type PixiCardThumbnailSize = {
	height: number;
	width: number;
};

export type PixiCardThumbnailLayout = {
	alpha: number;
	height: number;
	width: number;
	x: number;
	y: number;
};

// Thumbnails cover the poster window and are center-cropped like object-fit:
// cover, so cards do not reveal empty poster gutters for mismatched aspect ratios.
export function getPixiCardThumbnailLayout(
	position: MediaWallItemViewportPosition,
	textureSize: PixiCardThumbnailSize,
): PixiCardThumbnailLayout | null {
	if (textureSize.width <= 0 || textureSize.height <= 0) {
		return null;
	}

	const posterBounds = getPosterBounds(position);
	const scale        = Math.max(
		posterBounds.width / textureSize.width,
		posterBounds.height / textureSize.height,
	);
	const scaledWidth  = textureSize.width * scale;
	const scaledHeight = textureSize.height * scale;

	return {
		alpha:  0.95,
		height: scaledHeight,
		width:  scaledWidth,
		x:      posterBounds.x + ((posterBounds.width - scaledWidth) / 2),
		y:      posterBounds.y + ((posterBounds.height - scaledHeight) / 2),
	};
}
