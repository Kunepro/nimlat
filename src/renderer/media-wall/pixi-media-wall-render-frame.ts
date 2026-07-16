import type { Texture } from "pixi.js";
import type {
	MediaWallItem,
	MediaWallItemViewportPosition,
	MediaWallLayout,
	MediaWallLoadedRange,
	MediaWallTerminalState,
	MediaWallVisibleRange,
} from "../types/media-wall";
import {
	calculateMediaWallVisibleRange,
	getMediaWallItemViewportPosition,
} from "./media-wall-layout";
import type { PixiCardRenderState } from "./pixi-card-renderer-types";
import {
	createPixiMediaWallCardRenderState,
	type PixiMediaWallExitingCardTarget,
} from "./pixi-media-wall-card-state";
import {
	createPixiMediaWallThumbnailFrameState,
	hasPixiMediaWallThumbnailLoadBudget,
	recordPixiMediaWallQueuedThumbnailLoad,
	recordPixiMediaWallThumbnailFrameItem,
} from "./pixi-media-wall-thumbnail-frame";

const MAX_NEW_THUMBNAIL_LOADS_PER_FRAME = 16;

export interface PixiMediaWallFrameCard<TItem> {
	bind: (
		item: TItem | null,
		index: number,
		position: MediaWallItemViewportPosition,
		state: PixiCardRenderState,
		texture: Texture | null,
	) => boolean;
	release: () => void;
}

interface PixiMediaWallFrameTextureCache {
	evictUnused: (visibleItemIds: ReadonlySet<string>) => void;
	peekTexture: (thumbnailUrl?: string) => Texture | null;
}

export interface PixiMediaWallFrameRanges {
	viewportRange: MediaWallVisibleRange;
	visibleCount: number;
	visibleRange: MediaWallVisibleRange;
}

interface RenderPixiMediaWallFrameInput<TItem> {
	actionTerminalState: MediaWallTerminalState | null;
	cardPool: ReadonlyArray<PixiMediaWallFrameCard<TItem>>;
	exitingCardTarget: PixiMediaWallExitingCardTarget | null;
	focusedIndex: number | null;
	hoveredIndex: number | null;
	itemsRange: MediaWallLoadedRange<TItem>;
	layout: MediaWallLayout;
	mapItem: (item: TItem) => MediaWallItem;
	pendingThumbnailCount: number;
	projectorHoveredIndex: number | null;
	queueThumbnailLoad: (item: MediaWallItem) => boolean;
	ranges: PixiMediaWallFrameRanges;
	scrollTop: number;
	selectedIndex: number | null;
	selectedIndexes: ReadonlySet<number>;
	thumbnailCache: PixiMediaWallFrameTextureCache;
}

export interface PixiMediaWallFrameRenderResult {
	hasActiveCardAnimation: boolean;
	visibleRange: MediaWallVisibleRange;
	visibleTextureCount: number;
	visibleThumbnailUrlCount: number;
}

interface RecordFrameThumbnailItemRequest {
	globalIndex: number;
	item: MediaWallItem;
	queueThumbnailLoad: (item: MediaWallItem) => boolean;
	texture: Texture | null;
	thumbnailFrame: ReturnType<typeof createPixiMediaWallThumbnailFrameState>;
	viewportRange: MediaWallVisibleRange;
}

export function resolvePixiMediaWallFrameRanges(
	layout: MediaWallLayout,
	scrollTop: number,
): PixiMediaWallFrameRanges {
	const visibleRange  = calculateMediaWallVisibleRange(
		layout,
		scrollTop,
	);
	const viewportRange = calculateMediaWallVisibleRange(
		layout,
		scrollTop,
		0,
	);
	const visibleCount  = Math.max(
		0,
		visibleRange.lastIndexExclusive - visibleRange.firstIndex,
	);

	return {
		viewportRange,
		visibleCount,
		visibleRange,
	};
}

// Renders one virtualized wall frame. The renderer class owns Pixi lifecycle and
// pooling; this module owns per-frame binding so thumbnail budget and recycled
// card semantics stay testable outside a real GPU context.
export function renderPixiMediaWallFrame<TItem>({
																									actionTerminalState,
																									cardPool,
																									exitingCardTarget,
																									focusedIndex,
																									hoveredIndex,
																									itemsRange,
																									layout,
																									mapItem,
																									pendingThumbnailCount,
																									projectorHoveredIndex,
																									queueThumbnailLoad,
																									ranges,
																									scrollTop,
																									selectedIndex,
																									selectedIndexes,
																									thumbnailCache,
																								}: RenderPixiMediaWallFrameInput<TItem>): PixiMediaWallFrameRenderResult {
	const thumbnailFrame       = createPixiMediaWallThumbnailFrameState({
		maxNewThumbnailLoads: MAX_NEW_THUMBNAIL_LOADS_PER_FRAME,
		pendingThumbnailCount,
	});
	let hasActiveCardAnimation = false;

	for (let poolIndex = 0; poolIndex < cardPool.length; poolIndex += 1) {
		const globalIndex  = ranges.visibleRange.firstIndex + poolIndex;
		const cardRenderer = cardPool[ poolIndex ];
		if (!cardRenderer || globalIndex >= ranges.visibleRange.lastIndexExclusive) {
			cardRenderer?.release();
			continue;
		}

		const position = getMediaWallItemViewportPosition(
			layout,
			globalIndex,
			scrollTop,
		);
		if (!position) {
			cardRenderer.release();
			continue;
		}

		const item       = getFrameRangeItem(
			itemsRange,
			globalIndex,
		);
		const mappedItem = item ? mapItem(item) : null;
		const texture    = mappedItem?.thumbnailUrl
			? thumbnailCache.peekTexture(mappedItem.thumbnailUrl)
			: null;

		if (mappedItem) {
			recordFrameThumbnailItem({
				globalIndex,
				item:          mappedItem,
				queueThumbnailLoad,
				texture,
				thumbnailFrame,
				viewportRange: ranges.viewportRange,
			});
		}

		if (cardRenderer.bind(
			item,
			globalIndex,
			position,
			createPixiMediaWallCardRenderState({
				actionTerminalState,
				exitingCardTarget,
				focusedIndex,
				globalIndex,
				hoveredIndex,
				itemPresent:  item !== null,
				mappedItemId: mappedItem?.id ?? null,
				projectorHoveredIndex,
				selectedIndex,
				selectedIndexes,
			}),
			texture,
		)) {
			hasActiveCardAnimation = true;
		}
	}

	// Overscan textures are useful after the visible viewport has first claim on
	// the bounded load queue, so scroll-adjacent cards warm up without starving
	// the actual on-screen cards.
	for (const item of thumbnailFrame.overscanThumbnailItems) {
		if (!hasPixiMediaWallThumbnailLoadBudget(thumbnailFrame)) {
			break;
		}
		if (queueThumbnailLoad(item)) {
			recordPixiMediaWallQueuedThumbnailLoad(thumbnailFrame);
		}
	}

	thumbnailCache.evictUnused(thumbnailFrame.visibleItemIds);

	return {
		hasActiveCardAnimation,
		visibleRange:             ranges.visibleRange,
		visibleTextureCount:      thumbnailFrame.visibleTextureCount,
		visibleThumbnailUrlCount: thumbnailFrame.visibleThumbnailUrlCount,
	};
}

function getFrameRangeItem<TItem>(range: MediaWallLoadedRange<TItem>, globalIndex: number): TItem | null {
	const localIndex = globalIndex - range.offset;
	return localIndex >= 0 && localIndex < range.items.length
		? range.items[ localIndex ] ?? null
		: null;
}

function recordFrameThumbnailItem({
																		globalIndex,
																		item,
																		queueThumbnailLoad,
																		texture,
																		thumbnailFrame,
																		viewportRange,
																	}: RecordFrameThumbnailItemRequest): void {
	const textureReady       = Boolean(
		texture
		&& !texture.destroyed
		&& texture.width > 0
		&& texture.height > 0,
	);
	const thumbnailFrameItem = recordPixiMediaWallThumbnailFrameItem(
		thumbnailFrame,
		{
			globalIndex,
			item,
			textureReady,
			viewportRange,
		},
	);
	if (thumbnailFrameItem.shouldQueueVisibleThumbnail && queueThumbnailLoad(item)) {
		recordPixiMediaWallQueuedThumbnailLoad(thumbnailFrame);
	}
}
