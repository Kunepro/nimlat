import type {
	MediaWallItemViewportPosition,
	MediaWallLayout,
	MediaWallLayoutConfig,
	MediaWallLayoutInput,
	MediaWallPoint,
	MediaWallVisibleRange,
} from "../types/media-wall";

export const DEFAULT_MEDIA_WALL_LAYOUT_CONFIG: MediaWallLayoutConfig = {
	minColumns:             1,
	maxColumns:             10,
	targetCardWidth:        200,
	minCardWidth:           230,
	maxCardWidth:           250,
	posterAspectRatio:      1.45,
	bodyHeight:             78,
	horizontalGap:          20,
	verticalGap:            20,
	contentInsetTop:        40,
	contentInsetBottom:     40,
	contentInsetHorizontal: 36,
	overscanRows:           3,
};

function resolveConfig(config?: Partial<MediaWallLayoutConfig>): MediaWallLayoutConfig {
	return {
		...DEFAULT_MEDIA_WALL_LAYOUT_CONFIG,
		...config,
	};
}

function clampInteger(value: number, minimum: number): number {
	if (!Number.isFinite(value)) {
		return minimum;
	}

	return Math.max(
		minimum,
		Math.floor(value),
	);
}

function resolveColumnWidth(availableWidth: number, columns: number, horizontalGap: number): number {
	return (availableWidth - horizontalGap * (columns - 1)) / columns;
}

function resolveColumns(viewportWidth: number, config: MediaWallLayoutConfig): number {
	const availableWidth = Math.max(
		1,
		viewportWidth - (config.contentInsetHorizontal * 2),
	);
	const minColumns       = clampInteger(
		config.minColumns,
		1,
	);
	const maxColumns       = Math.max(
		minColumns,
		clampInteger(
			config.maxColumns,
			minColumns,
		),
	);
	const targetCardWidth  = Math.max(
		1,
		config.targetCardWidth,
	);
	const minCardWidth     = Math.max(
		1,
		Math.min(
			config.minCardWidth,
			config.maxCardWidth,
		),
	);
	const estimatedColumns = Math.floor((availableWidth + config.horizontalGap) / (targetCardWidth + config.horizontalGap));
	const widestCandidate  = Math.max(
		minColumns,
		Math.min(
			maxColumns,
			estimatedColumns,
		),
	);

	// At the 800px app minimum the wall should drop to fewer columns instead of
	// compressing card chrome and poster proportions below the readable card size.
	for (let columns = widestCandidate; columns > minColumns; columns -= 1) {
		if (resolveColumnWidth(
			availableWidth,
			columns,
			config.horizontalGap,
		) >= minCardWidth) {
			return columns;
		}
	}

	return minColumns;
}

export function calculateMediaWallLayout(input: MediaWallLayoutInput): MediaWallLayout {
	const config         = resolveConfig(input.config);
	const viewportWidth  = clampInteger(
		input.viewportWidth,
		1,
	);
	const viewportHeight = clampInteger(
		input.viewportHeight,
		1,
	);
	const itemCount      = clampInteger(
		input.itemCount,
		0,
	);
	const columns        = resolveColumns(
		viewportWidth,
		config,
	);
	const availableWidth = Math.max(
		1,
		viewportWidth - (config.contentInsetHorizontal * 2),
	);
	const columnWidth = resolveColumnWidth(
		availableWidth,
		columns,
		config.horizontalGap,
	);
	const cardWidth      = Math.min(
		Math.max(
			1,
			Math.floor(columnWidth),
		),
		config.maxCardWidth,
	);
	const posterHeight   = Math.round(cardWidth * config.posterAspectRatio);
	const bodyHeight     = clampInteger(
		config.bodyHeight,
		0,
	);
	const cardHeight     = posterHeight + bodyHeight;
	const rowHeight      = cardHeight + config.verticalGap;
	const totalRows      = Math.ceil(itemCount / columns);
	const totalHeight = config.contentInsetTop + (totalRows * rowHeight) + config.contentInsetBottom;
	const gridWidth      = columns * cardWidth + config.horizontalGap * (columns - 1);

	return {
		viewportWidth,
		viewportHeight,
		itemCount,
		cardWidth,
		posterHeight,
		bodyHeight,
		cardHeight,
		horizontalGap: config.horizontalGap,
		verticalGap:   config.verticalGap,
		columns,
		rowHeight,
		totalRows,
		totalHeight,
		gridWidth,
		// Pixi owns glow clearance inside the canvas: callers keep the canvas flush, while
		// layout insets keep blurred card light from clipping at the viewport edges.
		xOrigin:            Math.max(
			config.contentInsetHorizontal,
			config.contentInsetHorizontal + Math.floor((availableWidth - gridWidth) / 2),
		),
		contentInsetTop:    config.contentInsetTop,
		contentInsetBottom: config.contentInsetBottom,
		contentInsetHorizontal: config.contentInsetHorizontal,
		overscanRows:       config.overscanRows,
	};
}

export function calculateMediaWallVisibleRange(
	layout: MediaWallLayout,
	scrollTop: number,
	overscanRows: number = layout.overscanRows,
): MediaWallVisibleRange {
	if (layout.itemCount === 0 || layout.totalRows === 0) {
		return {
			firstRow:           0,
			lastRowExclusive:   0,
			firstIndex:         0,
			lastIndexExclusive: 0,
		};
	}

	const normalizedScrollTop = Math.max(
		0,
		scrollTop - layout.contentInsetTop,
	);
	const firstRow            = Math.max(
		0,
		Math.floor(normalizedScrollTop / layout.rowHeight) - overscanRows,
	);
	const lastRowExclusive    = Math.min(
		layout.totalRows,
		Math.ceil((normalizedScrollTop + layout.viewportHeight) / layout.rowHeight) + overscanRows,
	);

	return {
		firstRow,
		lastRowExclusive,
		firstIndex:         firstRow * layout.columns,
		lastIndexExclusive: Math.min(
			layout.itemCount,
			lastRowExclusive * layout.columns,
		),
	};
}

export function getMediaWallItemViewportPosition(
	layout: MediaWallLayout,
	index: number,
	scrollTop: number,
): MediaWallItemViewportPosition | null {
	if (!Number.isInteger(index) || index < 0 || index >= layout.itemCount) {
		return null;
	}

	const row    = Math.floor(index / layout.columns);
	const column = index % layout.columns;

	return {
		index,
		row,
		column,
		columns: layout.columns,
		x:       layout.xOrigin + column * (layout.cardWidth + layout.horizontalGap),
		y:       layout.contentInsetTop + row * layout.rowHeight - Math.max(
			0,
			scrollTop,
		),
		width:   layout.cardWidth,
		height:  layout.cardHeight,
	};
}

export function hitTestMediaWall(
	layout: MediaWallLayout,
	point: MediaWallPoint,
	scrollTop: number,
): number | null {
	const localX = point.x - layout.xOrigin;
	if (localX < 0 || localX >= layout.gridWidth) {
		return null;
	}

	const cellWidth = layout.cardWidth + layout.horizontalGap;
	const column    = Math.floor(localX / cellWidth);
	if (column < 0 || column >= layout.columns) {
		return null;
	}

	const xInCell = localX - column * cellWidth;
	if (xInCell < 0 || xInCell >= layout.cardWidth) {
		return null;
	}

	const absoluteY = point.y + Math.max(
		0,
		scrollTop,
	) - layout.contentInsetTop;
	if (absoluteY < 0) {
		return null;
	}

	const row = Math.floor(absoluteY / layout.rowHeight);
	if (row < 0 || row >= layout.totalRows) {
		return null;
	}

	const yInRow = absoluteY - row * layout.rowHeight;
	if (yInRow < 0 || yInRow >= layout.cardHeight) {
		return null;
	}

	const index = row * layout.columns + column;
	return index < layout.itemCount ? index : null;
}
