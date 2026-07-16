import type { MediaWallItemViewportPosition } from "../types/media-wall";
import type { PixiCardPosterBounds } from "./pixi-card-renderer-types";

const CARD_POSTER_LEFT             = 12;
const CARD_POSTER_TOP              = 12;
const CARD_POSTER_BOTTOM_RESERVE   = 112;
const ACTION_BUTTON_SIZE           = 24;
const ACTION_BUTTON_RIGHT_INSET    = 2;
export const CARD_PROJECTOR_BOTTOM = 42;
export const CARD_PROJECTOR_HEIGHT = 20;

export function getPosterBounds(position: MediaWallItemViewportPosition): PixiCardPosterBounds {
	return {
		x:      CARD_POSTER_LEFT,
		y:      CARD_POSTER_TOP,
		width:  position.width - (CARD_POSTER_LEFT * 2),
		height: Math.max(
			40,
			position.height - CARD_POSTER_BOTTOM_RESERVE,
		),
	};
}

export function getActionButtonBounds(position: MediaWallItemViewportPosition): {
	x: number;
	y: number;
	size: number;
} {
	const posterBounds = getPosterBounds(position);
	return {
		x:    posterBounds.x + posterBounds.width - ACTION_BUTTON_SIZE - ACTION_BUTTON_RIGHT_INSET,
		y:    posterBounds.y + ACTION_BUTTON_RIGHT_INSET,
		size: ACTION_BUTTON_SIZE,
	};
}

export function getFooterProjectorCenterY(position: MediaWallItemViewportPosition): number {
	// Footer badges align to the physical projector body, so UI labels can move
	// without changing the projector hit target or beam geometry.
	return position.height - CARD_PROJECTOR_BOTTOM + (CARD_PROJECTOR_HEIGHT / 2);
}
