import type {
	Container,
	Texture,
} from "pixi.js";
import type {
	MediaWallItem,
	MediaWallLayout,
	MediaWallSize,
	MediaWallVisibleRange,
} from "../types/media-wall";
import { calculateMediaWallLayout } from "./media-wall-layout";
import { PixiMediaWallDiagnosticsTracker } from "./pixi-media-wall-diagnostics";
import type { PixiMediaWallFrameCard } from "./pixi-media-wall-render-frame";
import {
	renderPixiMediaWallFrame,
	resolvePixiMediaWallFrameRanges,
} from "./pixi-media-wall-render-frame";
import type { PixiMediaWallRendererFrameState } from "./pixi-media-wall-renderer-state";

interface PixiMediaWallRendererPassCardPool<TItem> {
	cards: ReadonlyArray<PixiMediaWallFrameCard<TItem>>;
	ensureVisibleCount: (layer: Pick<Container, "addChild"> | null, visibleCount: number) => void;
	size: number;
}

interface PixiMediaWallRendererPassThumbnailCache {
	evictUnused: (visibleItemIds: ReadonlySet<string>) => void;
	failedCount: number;
	getDiagnostics: () => {
		loadAttemptCount: number;
		loadSuccessCount: number;
		lastLoadUrl?: string;
		lastResolvedLoadUrl?: string;
		lastLoadOutcome?: string;
		lastLoadDetail?: string;
	};
	peekTexture: (thumbnailUrl?: string) => Texture | null;
	size: number;
}

interface PixiMediaWallRendererPassThumbnailQueue {
	pendingCount: number;
	queue: (item: MediaWallItem) => boolean;
}

interface RenderPixiMediaWallRendererPassInput<TItem> {
	cardPool: PixiMediaWallRendererPassCardPool<TItem>;
	frameState: PixiMediaWallRendererFrameState<TItem>;
	mapItem: (item: TItem) => MediaWallItem;
	size: MediaWallSize;
	thumbnailCache: PixiMediaWallRendererPassThumbnailCache;
	thumbnailLoadQueue: PixiMediaWallRendererPassThumbnailQueue;
	wallLayer: Pick<Container, "addChild"> | null;
}

export interface PixiMediaWallRendererPassResult {
	hasActiveCardAnimation: boolean;
	layout: MediaWallLayout;
	visibleRange: MediaWallVisibleRange;
	visibleTextureCount: number;
	visibleThumbnailUrlCount: number;
}

interface RecordPixiMediaWallRendererDiagnosticsInput<TItem> {
	cardPoolSize: number;
	diagnosticsTracker: PixiMediaWallDiagnosticsTracker;
	frameState: PixiMediaWallRendererFrameState<TItem>;
	lastRenderMs: number;
	pass: PixiMediaWallRendererPassResult;
	renderTimestamp: number;
	size: MediaWallSize;
	thumbnailCache: PixiMediaWallRendererPassThumbnailCache;
	thumbnailLoadQueue: PixiMediaWallRendererPassThumbnailQueue;
}

// One render pass owns the volatile per-frame work: layout/range calculation,
// card-pool growth, card binding, thumbnail queueing, and metrics returned to
// the lifecycle class. Pixi mount/destroy still belongs to PixiMediaWallRenderer.
export function renderPixiMediaWallRendererPass<TItem>({
																												 cardPool,
																												 frameState,
																												 mapItem,
																												 size,
																												 thumbnailCache,
																												 thumbnailLoadQueue,
																												 wallLayer,
																											 }: RenderPixiMediaWallRendererPassInput<TItem>): PixiMediaWallRendererPassResult {
	const layout = calculateMediaWallLayout({
		viewportWidth:  size.width,
		viewportHeight: size.height,
		itemCount:      frameState.itemsRange.total,
	});
	const ranges = resolvePixiMediaWallFrameRanges(
		layout,
		frameState.scrollTop,
	);

	cardPool.ensureVisibleCount(
		wallLayer,
		ranges.visibleCount,
	);

	const frame = renderPixiMediaWallFrame({
		actionTerminalState:   frameState.actionTerminalState,
		cardPool:              cardPool.cards,
		exitingCardTarget:     frameState.exitingCardTarget,
		focusedIndex:          frameState.focusedIndex,
		hoveredIndex:          frameState.hoveredIndex,
		itemsRange:            frameState.itemsRange,
		layout,
		mapItem,
		pendingThumbnailCount: thumbnailLoadQueue.pendingCount,
		projectorHoveredIndex: frameState.projectorHoveredIndex,
		queueThumbnailLoad:    (item) => thumbnailLoadQueue.queue(item),
		ranges,
		scrollTop:             frameState.scrollTop,
		selectedIndex:         frameState.selectedIndex,
		selectedIndexes:       frameState.selectedIndexes,
		thumbnailCache,
	});

	return {
		hasActiveCardAnimation:   frame.hasActiveCardAnimation,
		layout,
		visibleRange:             frame.visibleRange,
		visibleTextureCount:      frame.visibleTextureCount,
		visibleThumbnailUrlCount: frame.visibleThumbnailUrlCount,
	};
}

export function recordPixiMediaWallRendererDiagnostics<TItem>({
																																cardPoolSize,
																																diagnosticsTracker,
																																frameState,
																																lastRenderMs,
																																pass,
																																renderTimestamp,
																																size,
																																thumbnailCache,
																																thumbnailLoadQueue,
																															}: RecordPixiMediaWallRendererDiagnosticsInput<TItem>): void {
	diagnosticsTracker.recordFrame({
		size,
		scrollTop:                frameState.scrollTop,
		totalItems:               frameState.itemsRange.total,
		layout:                   pass.layout,
		visibleRange:             pass.visibleRange,
		poolSize:                 cardPoolSize,
		rangeOffset:              frameState.itemsRange.offset,
		rangeLength:              frameState.itemsRange.items.length,
		textureCacheSize:         thumbnailCache.size,
		pendingThumbnailCount:    thumbnailLoadQueue.pendingCount,
		failedThumbnailCount:     thumbnailCache.failedCount,
		visibleThumbnailUrlCount: pass.visibleThumbnailUrlCount,
		visibleTextureCount:      pass.visibleTextureCount,
		thumbnailDiagnostics:     thumbnailCache.getDiagnostics(),
		lastRenderMs,
		renderTimestamp,
	});
}
