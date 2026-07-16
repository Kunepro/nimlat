import type { MediaWallItemViewportPosition } from "../types/media-wall";

export const NEON_PLAQUE_TOP_WIDTH   = 56;
const NEON_PLAQUE_TOP_HEIGHT         = 12;
export const NEON_PLAQUE_SIDE_WIDTH  = 12;
export const NEON_PLAQUE_SIDE_HEIGHT = 42;

export type NeonPlaqueLabelSize = {
	height: number;
	width: number;
};

export type NeonPlaqueLabelLayout = {
	side: {
		x: number;
		y: number;
	};
	top: {
		x: number;
		y: number;
	};
};

// Plaque labels are tied to the metal clamps, not the card content grid; this
// layout keeps the text centered inside those physical details across card sizes.
export function getNeonPlaqueLabelLayout(
	position: MediaWallItemViewportPosition,
	topLabelSize: NeonPlaqueLabelSize,
	sideLabelSize: NeonPlaqueLabelSize,
): NeonPlaqueLabelLayout {
	const rightClampX = Math.max(
		16,
		position.width - NEON_PLAQUE_TOP_WIDTH - 20,
	);
	const lowerClampY = Math.max(
		24,
		position.height - 78,
	);

	return {
		side: {
			x: -3 + ((NEON_PLAQUE_SIDE_WIDTH - sideLabelSize.width) / 2),
			y: lowerClampY + ((NEON_PLAQUE_SIDE_HEIGHT - sideLabelSize.height) / 2),
		},
		top:  {
			x: rightClampX + ((NEON_PLAQUE_TOP_WIDTH - topLabelSize.width) / 2),
			y: -3 + ((NEON_PLAQUE_TOP_HEIGHT - topLabelSize.height) / 2),
		},
	};
}
