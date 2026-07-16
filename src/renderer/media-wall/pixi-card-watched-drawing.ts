import { Graphics } from "pixi.js";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import { getPosterBounds } from "./pixi-card-geometry";
import { WATCHED_GREEN_COLOR } from "./pixi-card-neon-color";

const WATCHED_RED_COLOR = 0xff3046;
// Keep watched posters clearly subdued across both group and media cards while
// leaving enough artwork visible to identify the item at a glance.
const WATCHED_POSTER_DIM_ALPHA = 0.68;

interface WatchedArmOptions {
	centerX: number;
	centerY: number;
	angle: number;
	innerGap: number;
	length: number;
	alpha: number;
}

function drawWatchedArm(graphics: Graphics, options: WatchedArmOptions): void {
	const {
					centerX,
					centerY,
					angle,
					innerGap,
					length,
					alpha,
				} = options;
	const startX = centerX + Math.cos(angle) * innerGap;
	const startY = centerY + Math.sin(angle) * innerGap;
	const endX   = centerX + Math.cos(angle) * length * 1.17;
	const endY   = centerY + Math.sin(angle) * length;

	graphics
		.moveTo(
			startX,
			startY,
		)
		.lineTo(
			endX,
			endY,
		)
		.stroke({
			color: WATCHED_RED_COLOR,
			alpha,
			width: 2.4,
		})
		.moveTo(
			startX,
			startY,
		)
		.lineTo(
			endX,
			endY,
		)
		.stroke({
			color: 0xffa0aa,
			alpha: alpha * 0.34,
			width: 0.8,
		});
}

function drawWatchedPosterOverlay(graphics: Graphics, position: MediaWallItemViewportPosition, timeMs: number): void {
	const posterBounds = getPosterBounds(position);
	const centerX      = posterBounds.x + (posterBounds.width / 2);
	const centerY      = posterBounds.y + (posterBounds.height / 2);
	const radius       = Math.min(
		posterBounds.height * 0.45,
		posterBounds.width * 0.74,
	);
	const flicker      = 0.62 + (Math.abs(Math.sin(timeMs / 83)) * 0.22) + (Math.abs(Math.sin(timeMs / 211)) * 0.12);
	const redAlpha     = Math.min(
		1,
		flicker,
	);

	graphics
		.clear()
		.roundRect(
			posterBounds.x,
			posterBounds.y,
			posterBounds.width,
			posterBounds.height,
			6,
		)
		.fill({
			color: 0x010409,
			alpha: WATCHED_POSTER_DIM_ALPHA,
		})
		.roundRect(
			posterBounds.x + 2,
			posterBounds.y + 2,
			posterBounds.width - 4,
			posterBounds.height - 4,
			5,
		)
		.stroke({
			color: WATCHED_GREEN_COLOR,
			alpha: 0.08,
			width: 1,
		});

	[
		0.96,
		2.18,
		4.10,
		5.32,
	].forEach(angle => drawWatchedArm(
		graphics,
		{
			centerX,
			centerY,
			angle,
			innerGap: 18,
			length:   radius,
			alpha:    redAlpha,
		},
	));
}

export function updateWatchedPosterOverlay(
	graphics: Graphics,
	position: MediaWallItemViewportPosition,
	isWatched: boolean,
	timeMs: number,
): void {
	graphics.visible = isWatched;
	if (isWatched) {
		drawWatchedPosterOverlay(
			graphics,
			position,
			timeMs,
		);
		return;
	}

	graphics.clear();
}
