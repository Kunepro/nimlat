import type {
	MediaWallItem,
	MediaWallVisibleRange,
} from "../types/media-wall";

export type PixiMediaWallThumbnailFrameState = {
	visibleItemIds: Set<string>;
	overscanThumbnailItems: MediaWallItem[];
	visibleThumbnailUrlCount: number;
	visibleTextureCount: number;
	newThumbnailLoadBudget: number;
};

type PixiMediaWallThumbnailFrameStateInput = {
	maxNewThumbnailLoads: number;
	pendingThumbnailCount: number;
};

type PixiMediaWallThumbnailFrameItemInput = {
	globalIndex: number;
	item: MediaWallItem;
	textureReady: boolean;
	viewportRange: MediaWallVisibleRange;
};

// Render-frame accounting stays in one short-lived object because the media wall
// render loop is hot and viewport thumbnails must claim queue budget before overscan.
export function createPixiMediaWallThumbnailFrameState({
																												 maxNewThumbnailLoads,
																												 pendingThumbnailCount,
																											 }: PixiMediaWallThumbnailFrameStateInput): PixiMediaWallThumbnailFrameState {
	return {
		visibleItemIds:           new Set<string>(),
		overscanThumbnailItems:   [],
		visibleThumbnailUrlCount: 0,
		visibleTextureCount:      0,
		newThumbnailLoadBudget:   Math.max(
			0,
			maxNewThumbnailLoads - pendingThumbnailCount,
		),
	};
}

export function hasPixiMediaWallThumbnailLoadBudget(state: PixiMediaWallThumbnailFrameState): boolean {
	return state.newThumbnailLoadBudget > 0;
}

export function recordPixiMediaWallQueuedThumbnailLoad(state: PixiMediaWallThumbnailFrameState): void {
	state.newThumbnailLoadBudget = Math.max(
		0,
		state.newThumbnailLoadBudget - 1,
	);
}

export function recordPixiMediaWallThumbnailFrameItem(
	state: PixiMediaWallThumbnailFrameState,
	{
		globalIndex,
		item,
		textureReady,
		viewportRange,
	}: PixiMediaWallThumbnailFrameItemInput,
): { shouldQueueVisibleThumbnail: boolean } {
	state.visibleItemIds.add(item.id);
	if (item.thumbnailUrl) {
		state.visibleThumbnailUrlCount += 1;
	}
	if (textureReady) {
		state.visibleTextureCount += 1;
	}

	const isInViewport = globalIndex >= viewportRange.firstIndex
		&& globalIndex < viewportRange.lastIndexExclusive;
	if (!isInViewport) {
		state.overscanThumbnailItems.push(item);
	}

	return {
		shouldQueueVisibleThumbnail: isInViewport
																	 && Boolean(item.thumbnailUrl)
																	 && hasPixiMediaWallThumbnailLoadBudget(state),
	};
}
