import type {
	MediaWallDiagnosticsSnapshot,
	MediaWallLayout,
	MediaWallSize,
	MediaWallVisibleRange,
} from "../types/media-wall";

type ThumbnailTextureDiagnostics = {
	loadAttemptCount: number;
	loadSuccessCount: number;
	lastLoadUrl?: string;
	lastResolvedLoadUrl?: string;
	lastLoadOutcome?: string;
	lastLoadDetail?: string;
};

type PixiMediaWallDiagnosticsInput = {
	size: MediaWallSize;
	scrollTop: number;
	totalItems: number;
	layout: MediaWallLayout;
	visibleRange: MediaWallVisibleRange;
	poolSize: number;
	rangeOffset: number;
	rangeLength: number;
	textureCacheSize: number;
	pendingThumbnailCount: number;
	failedThumbnailCount: number;
	visibleThumbnailUrlCount: number;
	visibleTextureCount: number;
	thumbnailDiagnostics: ThumbnailTextureDiagnostics;
	lastRenderMs: number;
	renderTimestamp: number;
	previousRenderTimestamp: number | null;
	previousAverageFps: number;
};

export type PixiMediaWallDiagnosticsFrameMetrics = Omit<
	PixiMediaWallDiagnosticsInput,
	| "previousAverageFps"
	| "previousRenderTimestamp"
>;

export function createInitialMediaWallDiagnostics(): MediaWallDiagnosticsSnapshot {
	return {
		mounted:                   false,
		viewportWidth:             1,
		viewportHeight:            1,
		scrollTop:                 0,
		totalItems:                0,
		totalRows:                 0,
		visibleFirstIndex:         0,
		visibleLastIndexExclusive: 0,
		visibleCount:              0,
		poolSize:                  0,
		rangeOffset:               0,
		rangeLength:               0,
		textureCacheSize:          0,
		pendingThumbnailCount:     0,
		failedThumbnailCount:      0,
		visibleThumbnailUrlCount:  0,
		visibleTextureCount:       0,
		thumbnailLoadAttemptCount: 0,
		thumbnailLoadSuccessCount: 0,
		lastRenderMs:              0,
		averageFps:                0,
		droppedFrameEstimate:      0,
	};
}

export function createMediaWallDiagnosticsSnapshot({
																										 size,
																										 scrollTop,
																										 totalItems,
																										 layout,
																										 visibleRange,
																										 poolSize,
																										 rangeOffset,
																										 rangeLength,
																										 textureCacheSize,
																										 pendingThumbnailCount,
																										 failedThumbnailCount,
																										 visibleThumbnailUrlCount,
																										 visibleTextureCount,
																										 thumbnailDiagnostics,
																										 lastRenderMs,
																										 renderTimestamp,
																										 previousRenderTimestamp,
																										 previousAverageFps,
																									 }: PixiMediaWallDiagnosticsInput): MediaWallDiagnosticsSnapshot {
	const frameIntervalMs = previousRenderTimestamp === null
		? 0
		: renderTimestamp - previousRenderTimestamp;
	const instantFps      = frameIntervalMs > 0
		? 1000 / frameIntervalMs
		: previousAverageFps;
	const averageFps      = previousAverageFps > 0
		? (previousAverageFps * 0.85) + (instantFps * 0.15)
		: instantFps;
	const visibleCount    = Math.max(
		0,
		visibleRange.lastIndexExclusive - visibleRange.firstIndex,
	);

	return {
		mounted:                      true,
		viewportWidth:                size.width,
		viewportHeight:               size.height,
		scrollTop,
		totalItems,
		totalRows:                    layout.totalRows,
		visibleFirstIndex:            visibleRange.firstIndex,
		visibleLastIndexExclusive:    visibleRange.lastIndexExclusive,
		visibleCount,
		poolSize,
		rangeOffset,
		rangeLength,
		textureCacheSize,
		pendingThumbnailCount,
		failedThumbnailCount,
		visibleThumbnailUrlCount,
		visibleTextureCount,
		thumbnailLoadAttemptCount:    thumbnailDiagnostics.loadAttemptCount,
		thumbnailLoadSuccessCount:    thumbnailDiagnostics.loadSuccessCount,
		lastThumbnailLoadUrl:         thumbnailDiagnostics.lastLoadUrl,
		lastThumbnailResolvedLoadUrl: thumbnailDiagnostics.lastResolvedLoadUrl,
		lastThumbnailLoadOutcome:     thumbnailDiagnostics.lastLoadOutcome,
		lastThumbnailLoadDetail:      thumbnailDiagnostics.lastLoadDetail,
		lastRenderMs,
		averageFps,
		droppedFrameEstimate:         frameIntervalMs > 0
																		? Math.max(
				0,
				Math.floor(frameIntervalMs / 16.67) - 1,
			)
																		: 0,
	};
}

// Keeps frame timing state beside diagnostics construction, rather than leaking
// timestamp bookkeeping into the renderer lifecycle class.
export class PixiMediaWallDiagnosticsTracker {
	private lastRenderTimestamp: number | null = null;
	private snapshot                           = createInitialMediaWallDiagnostics();

	public getSnapshot(): MediaWallDiagnosticsSnapshot {
		return {
			...this.snapshot,
		};
	}

	public resetFrameTiming(): void {
		this.lastRenderTimestamp = null;
	}

	public markUnmounted(): void {
		this.snapshot = {
			...this.snapshot,
			mounted: false,
		};
	}

	public recordFrame(metrics: PixiMediaWallDiagnosticsFrameMetrics): void {
		const previousRenderTimestamp = this.lastRenderTimestamp;
		this.lastRenderTimestamp      = metrics.renderTimestamp;
		this.snapshot                 = createMediaWallDiagnosticsSnapshot({
			...metrics,
			previousAverageFps: this.snapshot.averageFps,
			previousRenderTimestamp,
		});
	}
}
