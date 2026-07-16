import {
	describe,
	expect,
	it,
} from "vitest";
import {
	calculateMediaWallLayout,
	calculateMediaWallVisibleRange,
	DEFAULT_MEDIA_WALL_LAYOUT_CONFIG,
	getMediaWallItemViewportPosition,
	hitTestMediaWall,
} from "./media-wall-layout";

describe(
	"media-wall-layout",
	() => {
		it(
			"keeps the repository card grid proportional without crushing cards",
			() => {
				const minimumLayout = calculateMediaWallLayout({
					viewportWidth:  800,
					viewportHeight: 480,
					itemCount:      100,
				});

				expect(minimumLayout.columns).toBe(2);
				expect(minimumLayout.cardWidth).toBeGreaterThanOrEqual(DEFAULT_MEDIA_WALL_LAYOUT_CONFIG.minCardWidth);

				expect(calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 900,
					itemCount:      100,
				}).columns).toBe(5);

				expect(calculateMediaWallLayout({
					viewportWidth:  2600,
					viewportHeight: 1200,
					itemCount:      100,
				}).columns).toBe(10);
			},
		);

		it(
			"calculates rows and virtual height from the DB total count",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});

				expect(layout.totalRows).toBe(Math.ceil(20_000 / layout.columns));
				expect(layout.totalHeight).toBe(layout.contentInsetTop + (layout.totalRows * layout.rowHeight) + layout.contentInsetBottom);
			},
		);

		it(
			"returns an empty range when there are no items",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  800,
					viewportHeight: 480,
					itemCount:      0,
				});

				expect(calculateMediaWallVisibleRange(
					layout,
					0,
				)).toEqual({
					firstRow:           0,
					lastRowExclusive:   0,
					firstIndex:         0,
					lastIndexExclusive: 0,
				});
			},
		);

		it(
			"calculates visible range with overscan",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});
				const range  = calculateMediaWallVisibleRange(
					layout,
					layout.contentInsetTop + (layout.rowHeight * 20),
					2,
				);

				expect(range.firstRow).toBe(18);
				expect(range.lastRowExclusive).toBe(24);
				expect(range.firstIndex).toBe(18 * layout.columns);
				expect(range.lastIndexExclusive).toBe(24 * layout.columns);
			},
		);

		it(
			"caps the visible range on an incomplete final row",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      37,
				});
				const range  = calculateMediaWallVisibleRange(
					layout,
					layout.totalHeight,
					3,
				);

				expect(range.lastRowExclusive).toBe(layout.totalRows);
				expect(range.lastIndexExclusive).toBe(37);
			},
		);

		it(
			"returns viewport positions using the centered grid origin",
			() => {
				const layout   = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      100,
				});
				const position = getMediaWallItemViewportPosition(
					layout,
					layout.columns + 1,
					layout.rowHeight / 2,
				);

				expect(position).toMatchObject({
					row:    1,
					column: 1,
					x:      layout.xOrigin + layout.cardWidth + layout.horizontalGap,
					y: layout.contentInsetTop + (layout.rowHeight / 2),
					width:  layout.cardWidth,
					height: layout.cardHeight,
				});
			},
		);

		it(
			"keeps card chrome inside the viewport at exact-fit widths",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth: 2240,
					viewportHeight: 900,
					itemCount:     100,
				});
				const lastColumnPosition = getMediaWallItemViewportPosition(
					layout,
					layout.columns - 1,
					0,
				);

				expect(lastColumnPosition).not.toBeNull();
				expect(lastColumnPosition?.x).toBeGreaterThanOrEqual(layout.contentInsetHorizontal);
				expect((lastColumnPosition?.x ?? 0) + (lastColumnPosition?.width ?? 0)).toBeLessThanOrEqual(
					layout.viewportWidth - layout.contentInsetHorizontal,
				);
			},
		);

		it(
			"hit-tests cards and rejects horizontal and vertical gaps",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      100,
				});

				expect(hitTestMediaWall(
					layout,
					{
						x: layout.xOrigin + 4,
						y: layout.contentInsetTop + 4,
					},
					0,
				)).toBe(0);

				expect(hitTestMediaWall(
					layout,
					{
						x: layout.xOrigin + layout.cardWidth + 4,
						y: layout.contentInsetTop + 4,
					},
					0,
				)).toBeNull();

				expect(hitTestMediaWall(
					layout,
					{
						x: layout.xOrigin + 4,
						y: layout.contentInsetTop + layout.cardHeight + 4,
					},
					0,
				)).toBeNull();
			},
		);

		it(
			"hit-tests using global item indices after scrolling",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      100,
				});

				expect(hitTestMediaWall(
					layout,
					{
						x: layout.xOrigin + 4,
						y: layout.contentInsetTop + 4,
					},
					layout.rowHeight * 3,
				)).toBe(layout.columns * 3);
			},
		);
	},
);
