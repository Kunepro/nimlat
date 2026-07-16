// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import type {
	MediaWallItem,
	MediaWallVisibleRange,
} from "../types/media-wall";
import {
	createPixiMediaWallThumbnailFrameState,
	hasPixiMediaWallThumbnailLoadBudget,
	recordPixiMediaWallQueuedThumbnailLoad,
	recordPixiMediaWallThumbnailFrameItem,
} from "./pixi-media-wall-thumbnail-frame";

function createVisibleRange(): MediaWallVisibleRange {
	return {
		firstRow:           0,
		lastRowExclusive:   2,
		firstIndex:         5,
		lastIndexExclusive: 15,
	};
}

function createMediaWallItem(overrides: Partial<MediaWallItem> = {}): MediaWallItem {
	return {
		id:           "media-1",
		title:        "Media 1",
		thumbnailUrl: "nimlat-image://poster-1",
		kind:         "library",
		...overrides,
	};
}

describe(
	"pixi media-wall thumbnail frame",
	() => {
		it(
			"clamps the per-render load budget around already pending thumbnails",
			() => {
				expect(createPixiMediaWallThumbnailFrameState({
					maxNewThumbnailLoads:  4,
					pendingThumbnailCount: 1,
				}).newThumbnailLoadBudget).toBe(3);

				expect(createPixiMediaWallThumbnailFrameState({
					maxNewThumbnailLoads:  4,
					pendingThumbnailCount: 10,
				}).newThumbnailLoadBudget).toBe(0);
			},
		);

		it(
			"records visible viewport items and lets them claim thumbnail budget first",
			() => {
				const state  = createPixiMediaWallThumbnailFrameState({
					maxNewThumbnailLoads:  4,
					pendingThumbnailCount: 0,
				});
				const result = recordPixiMediaWallThumbnailFrameItem(
					state,
					{
						globalIndex:   8,
						item:          createMediaWallItem(),
						textureReady:  true,
						viewportRange: createVisibleRange(),
					},
				);

				expect(result.shouldQueueVisibleThumbnail).toBe(true);
				expect(state.visibleItemIds).toEqual(new Set([ "media-1" ]));
				expect(state.visibleThumbnailUrlCount).toBe(1);
				expect(state.visibleTextureCount).toBe(1);
				expect(state.overscanThumbnailItems).toHaveLength(0);
			},
		);

		it(
			"tracks overscan items without letting them bypass the viewport-first queue",
			() => {
				const state        = createPixiMediaWallThumbnailFrameState({
					maxNewThumbnailLoads:  4,
					pendingThumbnailCount: 0,
				});
				const overscanItem = createMediaWallItem({
					id: "media-2",
				});
				const result       = recordPixiMediaWallThumbnailFrameItem(
					state,
					{
						globalIndex:   16,
						item:          overscanItem,
						textureReady:  false,
						viewportRange: createVisibleRange(),
					},
				);

				expect(result.shouldQueueVisibleThumbnail).toBe(false);
				expect(state.overscanThumbnailItems).toEqual([ overscanItem ]);
				expect(state.visibleThumbnailUrlCount).toBe(1);
				expect(state.visibleTextureCount).toBe(0);
			},
		);

		it(
			"decrements queued-load budget without going negative",
			() => {
				const state = createPixiMediaWallThumbnailFrameState({
					maxNewThumbnailLoads:  1,
					pendingThumbnailCount: 0,
				});

				expect(hasPixiMediaWallThumbnailLoadBudget(state)).toBe(true);
				recordPixiMediaWallQueuedThumbnailLoad(state);
				expect(state.newThumbnailLoadBudget).toBe(0);
				expect(hasPixiMediaWallThumbnailLoadBudget(state)).toBe(false);
				recordPixiMediaWallQueuedThumbnailLoad(state);
				expect(state.newThumbnailLoadBudget).toBe(0);
			},
		);
	},
);
