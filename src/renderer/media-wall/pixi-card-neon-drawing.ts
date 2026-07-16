import {
	Graphics,
	Text,
	TextStyle,
} from "pixi.js";
import type { MediaWallItemViewportPosition } from "../types/media-wall";
import {
	drawBrushedMetalPlaque,
	drawScrewHead,
} from "./pixi-card-metal-drawing";
import { WATCHED_GREEN_COLOR } from "./pixi-card-neon-color";
import {
	NEON_PLAQUE_SIDE_HEIGHT,
	NEON_PLAQUE_SIDE_WIDTH,
	NEON_PLAQUE_TOP_WIDTH,
} from "./pixi-card-neon-plaque-model";

const CARD_RADIUS                   = 8;
const NEON_PLAQUE_LABEL_FONT_FAMILY = "Goldman, JetBrains Mono, Cascadia Mono, monospace";
const NEON_PLAQUE_LABEL_COLOR       = 0xf5f7ff;

export function drawTurnedOffNeonBorder(
	graphics: Graphics,
	position: MediaWallItemViewportPosition,
	borderColor: number,
	lightIntensity: number,
	isFocused: boolean,
): void {
	const tubeAlpha           = 0.48 + ((isFocused ? 0.5 : 0.46) * lightIntensity);
	const glassHighlightAlpha = 0.42 + (0.4 * lightIntensity);
	const rightClampX         = Math.max(
		16,
		position.width - 62,
	);
	const lowerClampY         = Math.max(
		24,
		position.height - 78,
	);

	// The casing is intentionally stronger than a border stroke: it should read
	// as the card's physical edge, with inert glass tubing seated in a cyberpunk metal channel.
	graphics
		.clear()
		.roundRect(
			6,
			6,
			position.width - 12,
			position.height - 12,
			CARD_RADIUS,
		)
		.stroke({
			color: 0x020711,
			alpha: 0.98,
			width: 12,
		})
		.roundRect(
			6,
			6,
			position.width - 12,
			position.height - 12,
			CARD_RADIUS,
		)
		.stroke({
			color: 0x26344a,
			alpha: 0.98,
			width: 8,
		})
		.roundRect(
			8,
			8,
			position.width - 16,
			position.height - 16,
			CARD_RADIUS - 1,
		)
		.stroke({
			color: 0x0a1321,
			alpha: 0.98,
			width: 6,
		})
		.roundRect(
			3.25,
			3.25,
			position.width - 6.5,
			position.height - 6.5,
			CARD_RADIUS + 2,
		)
		.stroke({
			color: 0x88f8ff,
			alpha: tubeAlpha,
			width: isFocused ? 7.5 : 6.5,
		})
		.roundRect(
			3.25,
			3.25,
			position.width - 6.5,
			position.height - 6.5,
			CARD_RADIUS + 2,
		)
		.stroke({
			color: borderColor,
			alpha: 0.28 + (0.62 * lightIntensity),
			width: 3.4 + (1.4 * lightIntensity),
		})
		.roundRect(
			8.25,
			8.25,
			position.width - 16.5,
			position.height - 16.5,
			CARD_RADIUS - 1,
		)
		.stroke({
			color: 0x00131e,
			alpha: 0.68 - (0.54 * lightIntensity),
			width: 2.2,
		})
		.roundRect(
			2.75,
			2.75,
			position.width - 5.5,
			position.height - 5.5,
			CARD_RADIUS + 3,
		)
		.stroke({
			color: 0xe8feff,
			alpha: glassHighlightAlpha,
			width: 1.6 + (1.1 * lightIntensity),
		})
		.roundRect(
			9,
			9,
			position.width - 18,
			position.height - 17,
			CARD_RADIUS - 2,
		)
		.stroke({
			color: 0x000814,
			alpha: 0.68,
			width: 1.4,
		});

	graphics
		.moveTo(
			22,
			2.35,
		)
		.lineTo(
			Math.max(
				22,
				position.width - 74,
			),
			2.35,
		)
		.stroke({
			color: 0xffffff,
			alpha: 0.44 + (0.42 * lightIntensity),
			width: 1.35 + (0.65 * lightIntensity),
		})
		.moveTo(
			2.35,
			26,
		)
		.lineTo(
			2.35,
			Math.max(
				26,
				position.height - 96,
			),
		)
		.stroke({
			color: 0xffffff,
			alpha: 0.34 + (0.36 * lightIntensity),
			width: 1.35 + (0.65 * lightIntensity),
		})
		.moveTo(
			30,
			position.height - 2.35,
		)
		.lineTo(
			Math.max(
				30,
				position.width - 34,
			),
			position.height - 2.35,
		)
		.stroke({
			color: 0x00111d,
			alpha: 0.58,
			width: 1.2,
		})
		.moveTo(
			position.width - 2.35,
			36,
		)
		.lineTo(
			position.width - 2.35,
			Math.max(
				36,
				position.height - 48,
			),
		)
		.stroke({
			color: 0x00111d,
			alpha: 0.52,
			width: 1.2,
		});
	drawBrushedMetalPlaque(
		graphics,
		rightClampX,
		-3,
		42,
		12,
		3,
	);
	drawScrewHead(
		graphics,
		rightClampX + 7,
		3,
		1.5,
	);
	drawScrewHead(
		graphics,
		rightClampX + 35,
		3,
		1.5,
	);
	drawBrushedMetalPlaque(
		graphics,
		-3,
		lowerClampY,
		NEON_PLAQUE_SIDE_WIDTH,
		NEON_PLAQUE_SIDE_HEIGHT,
		3,
	);
	drawScrewHead(
		graphics,
		3,
		lowerClampY + 9,
		1.45,
	);
	drawScrewHead(
		graphics,
		3,
		lowerClampY + 33,
		1.45,
	);
}

export function drawNeonBorderMetalPlates(graphics: Graphics, position: MediaWallItemViewportPosition, isSelected: boolean, isWatched: boolean): void {
	const rightClampX = Math.max(
		16,
		position.width - NEON_PLAQUE_TOP_WIDTH - 20,
	);
	const lowerClampY = Math.max(
		24,
		position.height - 78,
	);

	graphics.clear();
	drawBrushedMetalPlaque(
		graphics,
		rightClampX,
		-3,
		NEON_PLAQUE_TOP_WIDTH,
		12,
		3,
	);
	drawScrewHead(
		graphics,
		rightClampX + 7,
		3,
		1.5,
		isSelected ? WATCHED_GREEN_COLOR : null,
	);
	drawScrewHead(
		graphics,
		rightClampX + NEON_PLAQUE_TOP_WIDTH - 7,
		3,
		1.5,
		isSelected ? WATCHED_GREEN_COLOR : null,
	);
	drawBrushedMetalPlaque(
		graphics,
		-3,
		lowerClampY,
		12,
		42,
		3,
	);
	drawScrewHead(
		graphics,
		3,
		lowerClampY + 9,
		1.45,
		isWatched ? WATCHED_GREEN_COLOR : null,
	);
	drawScrewHead(
		graphics,
		3,
		lowerClampY + 33,
		1.45,
		isWatched ? WATCHED_GREEN_COLOR : null,
	);
}

export function createNeonPlaqueLabel(text: string): Text {
	return new Text({
		text,
		style: new TextStyle({
			fill:       NEON_PLAQUE_LABEL_COLOR,
			fontFamily: NEON_PLAQUE_LABEL_FONT_FAMILY,
			fontSize:   8,
			fontWeight: "700",
			lineHeight: 10,
		}),
	});
}
