// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import type {
	MediaWallLayout,
	MediaWallVisibleRange,
} from "../types/media-wall";
import {
	createInitialMediaWallDiagnostics,
	createMediaWallDiagnosticsSnapshot,
	PixiMediaWallDiagnosticsTracker,
} from "./pixi-media-wall-diagnostics";

function createLayout(): MediaWallLayout {
	return {
		viewportWidth:          800,
		viewportHeight:         480,
		itemCount:              100,
		cardWidth:              120,
		posterHeight:           180,
		bodyHeight:             72,
		cardHeight:             252,
		horizontalGap:          16,
		verticalGap:            20,
		columns:                5,
		rowHeight:              272,
		totalRows:              20,
		totalHeight:            5_440,
		gridWidth:              664,
		xOrigin:                68,
		contentInsetTop:        24,
		contentInsetBottom:     24,
		contentInsetHorizontal: 24,
		overscanRows:           2,
	};
}

function createVisibleRange(): MediaWallVisibleRange {
	return {
		firstRow:           1,
		lastRowExclusive:   4,
		firstIndex:         5,
		lastIndexExclusive: 20,
	};
}

describe(
	"pixi media-wall diagnostics",
	() => {
		it(
			"creates an unmounted initial diagnostics snapshot",
			() => {
				expect(createInitialMediaWallDiagnostics()).toMatchObject({
					mounted:                   false,
					viewportWidth:             1,
					viewportHeight:            1,
					visibleCount:              0,
					thumbnailLoadAttemptCount: 0,
					averageFps:                0,
				});
			},
		);

		it(
			"maps runtime and texture metrics into one mounted snapshot",
			() => {
				const snapshot = createMediaWallDiagnosticsSnapshot({
					size:                     {
						width:  800,
						height: 480,
					},
					scrollTop:                320,
					totalItems:               100,
					layout:                   createLayout(),
					visibleRange:             createVisibleRange(),
					poolSize:                 15,
					rangeOffset:              4,
					rangeLength:              40,
					textureCacheSize:         12,
					pendingThumbnailCount:    3,
					failedThumbnailCount:     2,
					visibleThumbnailUrlCount: 10,
					visibleTextureCount:      8,
					thumbnailDiagnostics:     {
						loadAttemptCount:    30,
						loadSuccessCount:    22,
						lastLoadUrl:         "nimlat-image://poster",
						lastResolvedLoadUrl: "file:///poster.jpg",
						lastLoadOutcome:     "ready",
						lastLoadDetail:      "texture",
					},
					lastRenderMs:             12,
					renderTimestamp:          1_050,
					previousRenderTimestamp:  1_000,
					previousAverageFps:       40,
				});

				expect(snapshot).toMatchObject({
					mounted:                      true,
					viewportWidth:                800,
					viewportHeight:               480,
					scrollTop:                    320,
					totalItems:                   100,
					totalRows:                    20,
					visibleFirstIndex:            5,
					visibleLastIndexExclusive:    20,
					visibleCount:                 15,
					poolSize:                     15,
					rangeOffset:                  4,
					rangeLength:                  40,
					textureCacheSize:             12,
					pendingThumbnailCount:        3,
					failedThumbnailCount:         2,
					visibleThumbnailUrlCount:     10,
					visibleTextureCount:          8,
					thumbnailLoadAttemptCount:    30,
					thumbnailLoadSuccessCount:    22,
					lastThumbnailLoadUrl:         "nimlat-image://poster",
					lastThumbnailResolvedLoadUrl: "file:///poster.jpg",
					lastThumbnailLoadOutcome:     "ready",
					lastThumbnailLoadDetail:      "texture",
					lastRenderMs:                 12,
					droppedFrameEstimate:         1,
				});
				expect(snapshot.averageFps).toBeCloseTo(37);
			},
		);

		it(
			"tracks frame timing and exposes defensive diagnostics snapshots",
			() => {
				const tracker         = new PixiMediaWallDiagnosticsTracker();
				const firstSnapshot   = tracker.getSnapshot();
				firstSnapshot.mounted = true;

				expect(tracker.getSnapshot().mounted).toBe(false);

				tracker.recordFrame({
					size:                     {
						width:  800,
						height: 480,
					},
					scrollTop:                0,
					totalItems:               100,
					layout:                   createLayout(),
					visibleRange:             createVisibleRange(),
					poolSize:                 15,
					rangeOffset:              0,
					rangeLength:              40,
					textureCacheSize:         12,
					pendingThumbnailCount:    1,
					failedThumbnailCount:     0,
					visibleThumbnailUrlCount: 10,
					visibleTextureCount:      8,
					thumbnailDiagnostics:     {
						loadAttemptCount: 2,
						loadSuccessCount: 1,
					},
					lastRenderMs:             8,
					renderTimestamp:          1_000,
				});
				tracker.recordFrame({
					size:                     {
						width:  800,
						height: 480,
					},
					scrollTop:                20,
					totalItems:               100,
					layout:                   createLayout(),
					visibleRange:             createVisibleRange(),
					poolSize:                 15,
					rangeOffset:              0,
					rangeLength:              40,
					textureCacheSize:         12,
					pendingThumbnailCount:    0,
					failedThumbnailCount:     0,
					visibleThumbnailUrlCount: 10,
					visibleTextureCount:      9,
					thumbnailDiagnostics:     {
						loadAttemptCount: 3,
						loadSuccessCount: 2,
					},
					lastRenderMs:             9,
					renderTimestamp:          1_050,
				});

				const secondSnapshot = tracker.getSnapshot();
				expect(secondSnapshot.mounted).toBe(true);
				expect(secondSnapshot.scrollTop).toBe(20);
				expect(secondSnapshot.averageFps).toBeCloseTo(20);
				expect(secondSnapshot.droppedFrameEstimate).toBe(1);

				tracker.resetFrameTiming();
				tracker.recordFrame({
					size:                     {
						width:  800,
						height: 480,
					},
					scrollTop:                40,
					totalItems:               100,
					layout:                   createLayout(),
					visibleRange:             createVisibleRange(),
					poolSize:                 15,
					rangeOffset:              0,
					rangeLength:              40,
					textureCacheSize:         12,
					pendingThumbnailCount:    0,
					failedThumbnailCount:     0,
					visibleThumbnailUrlCount: 10,
					visibleTextureCount:      9,
					thumbnailDiagnostics:     {
						loadAttemptCount: 3,
						loadSuccessCount: 2,
					},
					lastRenderMs:             7,
					renderTimestamp:          2_000,
				});

				expect(tracker.getSnapshot()).toMatchObject({
					droppedFrameEstimate: 0,
					mounted:              true,
					scrollTop:            40,
				});

				tracker.markUnmounted();

				expect(tracker.getSnapshot().mounted).toBe(false);
			},
		);
	},
);
