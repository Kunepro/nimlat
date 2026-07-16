import type { MediaWallItemViewportPosition } from "../types/media-wall";

const CARD_META_HORIZONTAL_PADDING = 20;
// Mirrors the adult badge's right-anchored plaque plus a small text gap, so the
// format label cannot slide underneath the badge on compact cards.
const CARD_META_ADULT_SUBTITLE_RESERVE = 58;

type PixiCardTextBoxLayout = {
	width: number;
	x: number;
	y: number;
};

export type PixiCardTextLayout = {
	subtitle: PixiCardTextBoxLayout;
	title: PixiCardTextBoxLayout;
};

// Title and subtitle sit in the fixed metadata footer, while the adult badge can
// reserve extra right-side space. Keeping this pure protects card text from drift.
export function getPixiCardTextLayout(position: MediaWallItemViewportPosition, isAdult: boolean): PixiCardTextLayout {
	const subtitleRightReserve = isAdult
		? CARD_META_ADULT_SUBTITLE_RESERVE
		: CARD_META_HORIZONTAL_PADDING;

	return {
		subtitle: {
			width: Math.max(
				40,
				position.width - CARD_META_HORIZONTAL_PADDING - subtitleRightReserve,
			),
			x:     CARD_META_HORIZONTAL_PADDING,
			y:     position.height - 40,
		},
		title:    {
			width: Math.max(
				40,
				position.width - (CARD_META_HORIZONTAL_PADDING * 2),
			),
			x:     CARD_META_HORIZONTAL_PADDING,
			y:     position.height - 84,
		},
	};
}
