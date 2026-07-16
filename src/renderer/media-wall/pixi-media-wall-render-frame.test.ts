// @vitest-environment node
import type { Texture } from "pixi.js";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type {
	MediaWallItem,
	MediaWallLayout,
} from "../types/media-wall";
import {
	type PixiMediaWallFrameCard,
	renderPixiMediaWallFrame,
	resolvePixiMediaWallFrameRanges,
} from "./pixi-media-wall-render-frame";

interface SourceItem {
	index: number;
}

function createLayout(overrides: Partial<MediaWallLayout> = {}): MediaWallLayout {
	return {
		bodyHeight:             20,
		cardHeight:             100,
		cardWidth:              60,
		columns:                2,
		contentInsetBottom:     0,
		contentInsetHorizontal: 0,
		contentInsetTop:        0,
		gridWidth:              120,
		horizontalGap:          0,
		itemCount:              4,
		overscanRows:           1,
		posterHeight:           80,
		rowHeight:              100,
		totalHeight:            200,
		totalRows:              2,
		verticalGap:            0,
		viewportHeight:         100,
		viewportWidth:          120,
		xOrigin:                0,
		...overrides,
	};
}

function createSourceItem(index: number): SourceItem {
	return { index };
}

function mapItem(item: SourceItem): MediaWallItem {
	return {
		id:           `media-${ item.index }`,
		kind:         "library",
		thumbnailUrl: `url-${ item.index }`,
		title:        `Media ${ item.index }`,
	};
}

function createTexture(): Texture {
	return {
		destroyed: false,
		height:    20,
		width:     10,
	} as Texture;
}

function createCard<TItem>(hasActiveAnimation = false): PixiMediaWallFrameCard<TItem> {
	return {
		bind:    vi.fn(() => hasActiveAnimation),
		release: vi.fn(),
	};
}

describe(
	"pixi media-wall render frame",
	() => {
		it(
			"resolves visible and viewport ranges separately",
			() => {
				const ranges = resolvePixiMediaWallFrameRanges(
					createLayout(),
					0,
				);

				expect(ranges.viewportRange).toMatchObject({
					firstIndex:         0,
					lastIndexExclusive: 2,
				});
				expect(ranges.visibleRange).toMatchObject({
					firstIndex:         0,
					lastIndexExclusive: 4,
				});
				expect(ranges.visibleCount).toBe(4);
			},
		);

		it(
			"binds frame cards while letting viewport thumbnails spend budget before overscan",
			() => {
				const texture                 = createTexture();
				const queuedItemIds: string[] = [];
				const evictUnused             = vi.fn();
				const cards                   = [
					createCard<SourceItem>(),
					createCard<SourceItem>(),
					createCard<SourceItem>(true),
					createCard<SourceItem>(),
				];
				const result                  = renderPixiMediaWallFrame({
					actionTerminalState:   {
						kind:        "menu",
						index:       0,
						startedAtMs: 10,
					},
					cardPool:              cards,
					exitingCardTarget:     null,
					focusedIndex:          1,
					hoveredIndex:          0,
					itemsRange:            {
						offset: 0,
						total:  4,
						items:  [
							createSourceItem(0),
							createSourceItem(1),
							createSourceItem(2),
							createSourceItem(3),
						],
					},
					layout:                createLayout(),
					mapItem,
					pendingThumbnailCount: 14,
					projectorHoveredIndex: 2,
					queueThumbnailLoad:    (item) => {
						queuedItemIds.push(item.id);
						return true;
					},
					ranges:                resolvePixiMediaWallFrameRanges(
						createLayout(),
						0,
					),
					scrollTop:             0,
					selectedIndex:         null,
					selectedIndexes:       new Set([ 3 ]),
					thumbnailCache:        {
						evictUnused,
						peekTexture: (thumbnailUrl) => thumbnailUrl === "url-0" ? texture : null,
					},
				});

				expect(queuedItemIds).toEqual([
					"media-0",
					"media-1",
				]);
				expect(result).toMatchObject({
					hasActiveCardAnimation:   true,
					visibleTextureCount:      1,
					visibleThumbnailUrlCount: 4,
				});
				expect(cards[ 0 ].bind).toHaveBeenCalledWith(
					createSourceItem(0),
					0,
					expect.objectContaining({ index: 0 }),
					expect.objectContaining({
						actionMenuOpen:   true,
						hovered:          true,
						projectorHovered: false,
					}),
					texture,
				);
				expect(cards[ 1 ].bind).toHaveBeenCalledWith(
					createSourceItem(1),
					1,
					expect.objectContaining({ index: 1 }),
					expect.objectContaining({
						focused: true,
					}),
					null,
				);
				expect(cards[ 2 ].bind).toHaveBeenCalledWith(
					createSourceItem(2),
					2,
					expect.objectContaining({ index: 2 }),
					expect.objectContaining({
						projectorHovered: true,
					}),
					null,
				);
				expect(cards[ 3 ].bind).toHaveBeenCalledWith(
					createSourceItem(3),
					3,
					expect.objectContaining({ index: 3 }),
					expect.objectContaining({
						itemSelected: true,
						selected:     true,
					}),
					null,
				);
				expect(evictUnused).toHaveBeenCalledWith(new Set([
					"media-0",
					"media-1",
					"media-2",
					"media-3",
				]));
			},
		);

		it(
			"releases pooled cards outside the current visible range",
			() => {
				const cards  = [
					createCard<SourceItem>(),
					createCard<SourceItem>(),
					createCard<SourceItem>(),
				];
				const layout = createLayout({
					itemCount:   1,
					totalRows:   1,
					totalHeight: 100,
				});

				renderPixiMediaWallFrame({
					actionTerminalState:   null,
					cardPool:              cards,
					exitingCardTarget:     null,
					focusedIndex:          null,
					hoveredIndex:          null,
					itemsRange:            {
						offset: 0,
						total:  1,
						items:  [ createSourceItem(0) ],
					},
					layout,
					mapItem,
					pendingThumbnailCount: 16,
					projectorHoveredIndex: null,
					queueThumbnailLoad:    () => true,
					ranges:                resolvePixiMediaWallFrameRanges(
						layout,
						0,
					),
					scrollTop:             0,
					selectedIndex:         null,
					selectedIndexes:       new Set(),
					thumbnailCache:        {
						evictUnused: vi.fn(),
						peekTexture: () => null,
					},
				});

				expect(cards[ 0 ].bind).toHaveBeenCalledOnce();
				expect(cards[ 1 ].bind).not.toHaveBeenCalled();
				expect(cards[ 2 ].bind).not.toHaveBeenCalled();
				expect(cards[ 1 ].release).toHaveBeenCalledOnce();
				expect(cards[ 2 ].release).toHaveBeenCalledOnce();
			},
		);
	},
);
