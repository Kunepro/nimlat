import { Graphics } from "pixi.js";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import { getPixiCardLitNeonGlowStyle } from "./pixi-card-neon-glow-model";

const CARD_RADIUS = 8;

export function drawLitNeonGlow(
	graphics: Graphics,
	position: MediaWallItemViewportPosition,
	borderColor: number,
	neonIntensity: number,
	focused: boolean,
): void {
	const glowStyle = getPixiCardLitNeonGlowStyle(
		neonIntensity,
		focused,
	);

	graphics.clear();
	graphics.visible = glowStyle.visible;
	if (!glowStyle.visible) {
		return;
	}

	graphics
		.roundRect(
			-10,
			-8,
			position.width + 20,
			position.height + 16,
			CARD_RADIUS + 11,
		)
		.stroke({
			color: borderColor,
			alpha: glowStyle.outerBloomAlpha,
			width: 20,
		})
		.roundRect(
			-18,
			-14,
			position.width + 36,
			position.height + 28,
			CARD_RADIUS + 17,
		)
		.stroke({
			color: borderColor,
			alpha: glowStyle.wideBloomAlpha,
			width: 24,
		})
		.roundRect(
			-13,
			-19,
			position.width + 26,
			position.height + 38,
			CARD_RADIUS + 19,
		)
		.stroke({
			color: borderColor,
			alpha: glowStyle.tallBloomAlpha,
			width: 14,
		})
		.roundRect(
			-5,
			-12,
			position.width + 10,
			position.height + 24,
			CARD_RADIUS + 13,
		)
		.stroke({
			color: borderColor,
			alpha: glowStyle.sideBloomAlpha,
			width: 14,
		})
		.roundRect(
			-7,
			-7,
			position.width + 14,
			position.height + 14,
			CARD_RADIUS + 7,
		)
		.stroke({
			color: borderColor,
			alpha: glowStyle.innerTubeBloomAlpha,
			width: 24,
		})
		.roundRect(
			-3,
			-3,
			position.width + 6,
			position.height + 6,
			CARD_RADIUS + 3,
		)
		.stroke({
			color: borderColor,
			alpha: glowStyle.coreBloomAlpha,
			width: glowStyle.coreWidth,
		})
		.roundRect(
			1,
			1,
			position.width - 2,
			position.height - 2,
			CARD_RADIUS,
		)
		.stroke({
			color: 0xe8feff,
			alpha: glowStyle.glassHighlightAlpha,
			width: 1.75,
		});
}
