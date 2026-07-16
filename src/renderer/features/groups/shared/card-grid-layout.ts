const MIN_COLUMNS       = 5;
const MAX_COLUMNS       = 10;
const TARGET_CARD_WIDTH = 200;
const MAX_CARD_WIDTH    = 220;
const POSTER_RATIO      = 1.45;

export const GRID_HORIZONTAL_GAP          = 20;
export const GRID_VERTICAL_GAP            = 20;
export const DEFAULT_GRID_CONTAINER_WIDTH = 1400;

function resolveColumns(containerWidth: number): number {
	const estimatedColumns = Math.floor((containerWidth + GRID_HORIZONTAL_GAP) / (TARGET_CARD_WIDTH + GRID_HORIZONTAL_GAP));
	return Math.max(
		MIN_COLUMNS,
		Math.min(
			MAX_COLUMNS,
			estimatedColumns,
		),
	);
}

export function calculateCardGridLayout(containerWidth: number): {
	columns: number;
	columnWidth: number;
	cardWidth: number;
	posterHeight: number;
} {
	const columns      = resolveColumns(containerWidth);
	const columnWidth  = (containerWidth - GRID_HORIZONTAL_GAP * (columns - 1)) / columns;
	const cardWidth    = Math.min(
		Math.round(columnWidth),
		MAX_CARD_WIDTH,
	);
	const posterHeight = Math.round(cardWidth * POSTER_RATIO);

	return {
		columns,
		columnWidth,
		cardWidth,
		posterHeight,
	};
}
