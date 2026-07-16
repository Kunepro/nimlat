import { Graphics } from "pixi.js";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import { getPosterBounds } from "./pixi-card-geometry";
import { getPixiCardShellStyle } from "./pixi-card-shell-model";

const CARD_RADIUS   = 8;
const POSTER_RADIUS = 6;

export function drawCardShell(
	background: Graphics,
	poster: Graphics,
	posterMask: Graphics,
	position: MediaWallItemViewportPosition,
	placeholder: boolean,
): void {
	const posterBounds = getPosterBounds(position);
	const shellStyle   = getPixiCardShellStyle(placeholder);

	background
		.clear()
		.roundRect(
			0,
			0,
			position.width,
			position.height,
			CARD_RADIUS,
		)
		.fill({
			color: 0x111629,
			alpha: shellStyle.backgroundAlpha,
		})
		.stroke({
			color: 0x030914,
			alpha: 0.82,
			width: 1,
		});

	poster
		.clear()
		.roundRect(
			posterBounds.x,
			posterBounds.y,
			posterBounds.width,
			posterBounds.height,
			POSTER_RADIUS,
		)
		.fill({
			color: shellStyle.posterColor,
			alpha: shellStyle.posterAlpha,
		});

	posterMask
		.clear()
		.roundRect(
			posterBounds.x,
			posterBounds.y,
			posterBounds.width,
			posterBounds.height,
			POSTER_RADIUS,
		)
		.fill({
			color: 0xffffff,
			alpha: 1,
		});
}
