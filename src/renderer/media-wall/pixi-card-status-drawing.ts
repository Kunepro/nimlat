import {
	Graphics,
	Text,
	TextStyle,
} from "pixi.js";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
} from "../types/media-wall";
import { getFooterProjectorCenterY } from "./pixi-card-geometry";
import {
	drawBrushedMetalPlaque,
	drawScrewHead,
} from "./pixi-card-metal-drawing";
import { NEON_BORDER_COLOR } from "./pixi-card-neon-color";

const DEFAULT_TEXT_COLOR            = 0xf5f7ff;
const CARD_ADULT_BADGE_WIDTH        = 38;
const CARD_ADULT_BADGE_HEIGHT       = 20;
const CARD_ADULT_BADGE_RIGHT        = 14;
const CARD_ADULT_BADGE_SCREW_INSET  = 4.5;
const CARD_ADULT_BADGE_SCREW_RADIUS = 1.15;

function clampProgress(value?: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return 0;
	}
	return Math.min(
		100,
		Math.max(
			0,
			value,
		),
	);
}

export function createCountBadgeText(): Text {
	return new Text({
		text:  "",
		style: new TextStyle({
			fill:       DEFAULT_TEXT_COLOR,
			fontFamily: "Inter, Segoe UI, sans-serif",
			fontSize:   12,
			fontWeight: "700",
			lineHeight: 14,
		}),
	});
}

export function createAdultBadgeText(): Text {
	return new Text({
		text:  "18+",
		style: new TextStyle({
			fill:       DEFAULT_TEXT_COLOR,
			fontFamily: "Inter, Segoe UI, sans-serif",
			fontSize:   10,
			fontWeight: "800",
			lineHeight: 12,
		}),
	});
}

export function drawProgressBar(trackGraphics: Graphics, valueGraphics: Graphics, position: MediaWallItemViewportPosition, progressPercent?: number): void {
	const hasProgress = typeof progressPercent === "number";
	const progress    = hasProgress ? clampProgress(progressPercent) : 0;
	trackGraphics.clear();
	trackGraphics.visible = hasProgress;
	if (hasProgress) {
		trackGraphics
			.roundRect(
				12,
				position.height - 17,
				position.width - 24,
				5,
				2.5,
			)
			.fill({
				color: 0x2c3558,
				alpha: 0.9,
			});
	}

	valueGraphics.clear();
	valueGraphics.visible = hasProgress;
	if (hasProgress && progress > 0) {
		valueGraphics
			.roundRect(
				12,
				position.height - 17,
				(position.width - 24) * (progress / 100),
				5,
				2.5,
			)
			.fill({
				color: progress >= 100 ? 0x7fffd4 : 0x9db4ff,
				alpha: 0.95,
			});
	}
}

export function updateCountBadgeText(countBadgeText: Text, mapped: MediaWallItem | null): void {
	const count = mapped?.mediaCount;
	if (typeof count !== "number") {
		countBadgeText.visible = false;
		countBadgeText.text    = "";
		return;
	}

	const label                     = `${ Math.max(
		0,
		Math.floor(count),
	) }`;
	countBadgeText.text             = label;
	countBadgeText.style.fontSize   = label.length >= 3 ? 8 : label.length >= 2 ? 10 : 12;
	countBadgeText.style.lineHeight = 14;
	countBadgeText.position.set(
		10 + ((30 - countBadgeText.width) / 2),
		10 + ((24 - countBadgeText.height) / 2),
	);
	countBadgeText.visible = true;
}

export function updateAdultBadgeText(adultBadgeText: Text, mapped: MediaWallItem | null, position: MediaWallItemViewportPosition): void {
	const isVisible        = Boolean(mapped?.isAdult);
	adultBadgeText.visible = isVisible;
	if (!isVisible) {
		return;
	}

	const badgeX = position.width - CARD_ADULT_BADGE_RIGHT - CARD_ADULT_BADGE_WIDTH;
	const badgeY = getFooterProjectorCenterY(position) - (CARD_ADULT_BADGE_HEIGHT / 2);

	// The adult badge is anchored to the projector footer, so it remains visually
	// grouped with other card status hardware instead of drifting with title text.
	adultBadgeText.position.set(
		badgeX + ((CARD_ADULT_BADGE_WIDTH - adultBadgeText.width) / 2),
		badgeY + ((CARD_ADULT_BADGE_HEIGHT - adultBadgeText.height) / 2),
	);
}

export function drawCountBadgeBackground(countBadgeBackground: Graphics, mapped: MediaWallItem | null): void {
	const hasBadge = typeof mapped?.mediaCount === "number";
	countBadgeBackground.clear();
	if (!hasBadge) {
		countBadgeBackground.visible = false;
		return;
	}
	countBadgeBackground.visible = true;
	drawBrushedMetalPlaque(
		countBadgeBackground,
		10,
		10,
		30,
		24,
		5,
	);
	countBadgeBackground
		.roundRect(
			13,
			13,
			24,
			18,
			3,
		)
		.fill({
			color: 0x122238,
			alpha: 0.82,
		})
		.stroke({
			color: NEON_BORDER_COLOR,
			alpha: 0.38,
			width: 0.75,
		});
	drawScrewHead(
		countBadgeBackground,
		15,
		15,
		1.1,
	);
	drawScrewHead(
		countBadgeBackground,
		35,
		15,
		1.1,
	);
}

export function drawAdultBadgeBackground(adultBadgeBackground: Graphics, mapped: MediaWallItem | null, position: MediaWallItemViewportPosition): void {
	adultBadgeBackground.clear();
	if (!mapped?.isAdult) {
		adultBadgeBackground.visible = false;
		return;
	}

	adultBadgeBackground.visible = true;
	const badgeX                 = position.width - CARD_ADULT_BADGE_RIGHT - CARD_ADULT_BADGE_WIDTH;
	const badgeY                 = getFooterProjectorCenterY(position) - (CARD_ADULT_BADGE_HEIGHT / 2);

	adultBadgeBackground
		.roundRect(
			badgeX,
			badgeY,
			CARD_ADULT_BADGE_WIDTH,
			CARD_ADULT_BADGE_HEIGHT,
			8,
		)
		.fill({
			color: 0x61172d,
			alpha: 0.92,
		})
		.stroke({
			color: 0xff2f72,
			alpha: 0.78,
			width: 1,
		});
	drawScrewHead(
		adultBadgeBackground,
		badgeX + CARD_ADULT_BADGE_SCREW_INSET,
		badgeY + (CARD_ADULT_BADGE_HEIGHT / 2),
		CARD_ADULT_BADGE_SCREW_RADIUS,
	);
	drawScrewHead(
		adultBadgeBackground,
		badgeX + CARD_ADULT_BADGE_WIDTH - CARD_ADULT_BADGE_SCREW_INSET,
		badgeY + (CARD_ADULT_BADGE_HEIGHT / 2),
		CARD_ADULT_BADGE_SCREW_RADIUS,
	);
}
