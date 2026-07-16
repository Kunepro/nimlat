// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { MediaWallItem } from "../types/media-wall";
import { PixiMediaWallDiagnosticsTracker } from "./pixi-media-wall-diagnostics";
import type { PixiMediaWallFrameCard } from "./pixi-media-wall-render-frame";
import {
	recordPixiMediaWallRendererDiagnostics,
	renderPixiMediaWallRendererPass,
} from "./pixi-media-wall-renderer-pass";
import type { PixiMediaWallRendererFrameState } from "./pixi-media-wall-renderer-state";

interface SourceItem {
	index: number;
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

function createCard<TItem>(hasActiveAnimation = false): PixiMediaWallFrameCard<TItem> {
	return {
		bind:    vi.fn(() => hasActiveAnimation),
		release: vi.fn(),
	};
}

function createFrameState(overrides: Partial<PixiMediaWallRendererFrameState<SourceItem>> = {}): PixiMediaWallRendererFrameState<SourceItem> {
	return {
		actionTerminalState:   null,
		exitingCardTarget:     null,
		focusedIndex:          null,
		hoveredIndex:          1,
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
		projectorHoveredIndex: null,
		scrollTop:             0,
		selectedIndex:         null,
		selectedIndexes:       new Set([ 2 ]),
		...overrides,
	};
}

function createCardPool(cards: PixiMediaWallFrameCard<SourceItem>[] = []) {
	return {
		cards,
		ensureVisibleCount: vi.fn((
			_layer: unknown,
			visibleCount: number,
		) => {
			while (cards.length < visibleCount) {
				cards.push(createCard(cards.length === 1));
			}
		}),
		get size() {
			return cards.length;
		},
	};
}

function createThumbnailCache() {
	return {
		evictUnused:    vi.fn(),
		failedCount:    1,
		getDiagnostics: vi.fn(() => ({
			loadAttemptCount: 7,
			loadSuccessCount: 5,
		})),
		peekTexture:    vi.fn(() => null),
		size:           3,
	};
}

describe(
	"pixi media-wall renderer pass",
	() => {
		it(
			"renders a frame through the pool and thumbnail queue without a Pixi application",
			() => {
				const cards              = [
					createCard<SourceItem>(),
				];
				const cardPool           = createCardPool(cards);
				const thumbnailCache     = createThumbnailCache();
				const thumbnailLoadQueue = {
					pendingCount: 0,
					queue:        vi.fn(() => true),
				};

				const pass = renderPixiMediaWallRendererPass({
					cardPool,
					frameState: createFrameState(),
					mapItem,
					size:       {
						width:  800,
						height: 480,
					},
					thumbnailCache,
					thumbnailLoadQueue,
					wallLayer:  null,
				});

				expect(pass.layout.itemCount).toBe(4);
				expect(cardPool.ensureVisibleCount).toHaveBeenCalledWith(
					null,
					pass.visibleRange.lastIndexExclusive - pass.visibleRange.firstIndex,
				);
				expect(pass.hasActiveCardAnimation).toBe(true);
				expect(pass.visibleThumbnailUrlCount).toBe(4);
				expect(pass.visibleTextureCount).toBe(0);
				expect(cards[ 0 ].bind).toHaveBeenCalledWith(
					createSourceItem(0),
					0,
					expect.objectContaining({ index: 0 }),
					expect.objectContaining({
						hovered:      false,
						itemSelected: false,
					}),
					null,
				);
				expect(cards[ 1 ].bind).toHaveBeenCalledWith(
					createSourceItem(1),
					1,
					expect.objectContaining({ index: 1 }),
					expect.objectContaining({
						hovered: true,
					}),
					null,
				);
				expect(cards[ 2 ].bind).toHaveBeenCalledWith(
					createSourceItem(2),
					2,
					expect.objectContaining({ index: 2 }),
					expect.objectContaining({
						itemSelected: true,
					}),
					null,
				);
				expect(thumbnailLoadQueue.queue).toHaveBeenCalledTimes(4);
				expect(thumbnailCache.evictUnused).toHaveBeenCalledWith(new Set([
					"media-0",
					"media-1",
					"media-2",
					"media-3",
				]));
			},
		);

		it(
			"records diagnostics from the render-pass result",
			() => {
				const cardPool           = createCardPool();
				const frameState         = createFrameState();
				const thumbnailCache     = createThumbnailCache();
				const thumbnailLoadQueue = {
					pendingCount: 2,
					queue:        vi.fn(() => true),
				};
				const pass               = renderPixiMediaWallRendererPass({
					cardPool,
					frameState,
					mapItem,
					size:      {
						width:  800,
						height: 480,
					},
					thumbnailCache,
					thumbnailLoadQueue,
					wallLayer: null,
				});
				const tracker            = new PixiMediaWallDiagnosticsTracker();

				recordPixiMediaWallRendererDiagnostics({
					cardPoolSize:       cardPool.size,
					diagnosticsTracker: tracker,
					frameState,
					lastRenderMs:       12,
					pass,
					renderTimestamp:    100,
					size:               {
						width:  800,
						height: 480,
					},
					thumbnailCache,
					thumbnailLoadQueue,
				});

				expect(tracker.getSnapshot()).toMatchObject({
					failedThumbnailCount:      1,
					lastRenderMs:              12,
					mounted:                   true,
					pendingThumbnailCount:     2,
					poolSize:                  cardPool.size,
					rangeLength:               4,
					rangeOffset:               0,
					textureCacheSize:          3,
					thumbnailLoadAttemptCount: 7,
					thumbnailLoadSuccessCount: 5,
					totalItems:                4,
					visibleTextureCount:       pass.visibleTextureCount,
					visibleThumbnailUrlCount:  pass.visibleThumbnailUrlCount,
				});
				expect(thumbnailCache.getDiagnostics).toHaveBeenCalledOnce();
			},
		);
	},
);
