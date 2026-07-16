import type { Application } from "pixi.js";
import type {
	MediaWallDiagnosticsSnapshot,
	MediaWallItem,
	MediaWallLoadedRange,
	MediaWallRenderer,
	MediaWallSize,
	MediaWallTerminalState,
} from "../types/media-wall";
import { PixiCardRenderer } from "./pixi-card-renderer";
import { PixiMediaWallCardAnimationScheduler } from "./pixi-media-wall-card-animation-scheduler";
import { PixiMediaWallCardPool } from "./pixi-media-wall-card-pool";
import { PixiMediaWallDiagnosticsTracker } from "./pixi-media-wall-diagnostics";
import {
	recordPixiMediaWallRendererDiagnostics,
	renderPixiMediaWallRendererPass,
} from "./pixi-media-wall-renderer-pass";
import {
	attachPixiMediaWallCanvas,
	createPixiMediaWallApplication,
	createPixiMediaWallLayers,
	destroyPixiApplicationSafely,
	type PixiMediaWallLayers,
} from "./pixi-media-wall-renderer-runtime";
import { PixiMediaWallRendererState } from "./pixi-media-wall-renderer-state";
import { PixiMediaWallThumbnailLoadQueue } from "./pixi-media-wall-thumbnail-load-queue";
import { ThumbnailTextureCache } from "./thumbnail-texture-cache";

interface PixiMediaWallRendererOptions<TItem> {
	mapItem?: (item: TItem) => MediaWallItem;
	maxThumbnailTextures?: number;
	textureCache?: ThumbnailTextureCache;
}

function defaultMapItem<TItem>(item: TItem): MediaWallItem {
	return item as unknown as MediaWallItem;
}

export class PixiMediaWallRenderer<TItem> implements MediaWallRenderer<TItem> {
	private app: Application | null            = null;
	private host: HTMLElement | null           = null;
	private layers: PixiMediaWallLayers | null = null;
	private readonly mapItem: (item: TItem) => MediaWallItem;
	private readonly thumbnailCache: ThumbnailTextureCache;
	private readonly thumbnailLoadQueue: PixiMediaWallThumbnailLoadQueue;
	private readonly cardAnimationScheduler: PixiMediaWallCardAnimationScheduler;
	private readonly cardPool: PixiMediaWallCardPool<TItem, PixiCardRenderer<TItem>>;
	private readonly renderState: PixiMediaWallRendererState<TItem> = new PixiMediaWallRendererState();
	private readonly ownsThumbnailCache: boolean;
	private mountedGeneration                  = 0;
	private readonly diagnosticsTracker                             = new PixiMediaWallDiagnosticsTracker();
	private diagnosticsEnabled                 = false;
	private isRenderDisabled                   = false;

	public constructor(options: PixiMediaWallRendererOptions<TItem> = {}) {
		this.mapItem            = options.mapItem ?? defaultMapItem;
		this.thumbnailCache     = options.textureCache ?? new ThumbnailTextureCache({
			maxEntries: options.maxThumbnailTextures,
		});
		this.thumbnailLoadQueue     = new PixiMediaWallThumbnailLoadQueue({
			render:         () => this.render(),
			thumbnailCache: this.thumbnailCache,
		});
		this.cardAnimationScheduler = new PixiMediaWallCardAnimationScheduler({
			render: () => this.render(),
		});
		this.cardPool               = new PixiMediaWallCardPool({
			createCard: (mapItem) => new PixiCardRenderer<TItem>(mapItem),
			mapItem:    this.mapItem,
		});
		this.ownsThumbnailCache = !options.textureCache;
	}

	public async mount(container: HTMLElement): Promise<void> {
		this.destroy();

		const generation       = this.mountedGeneration + 1;
		this.mountedGeneration = generation;
		this.host              = container;
		this.isRenderDisabled = false;

		let app: Application;
		try {
			app = await createPixiMediaWallApplication(this.renderState.getSize());
		} catch {
			// Headless Electron can fail Pixi adapter creation. Keep the host DOM alive so
			// DB-backed lists, overlays, and E2E probes still exercise the renderer boundary.
			this.host = null;
			this.diagnosticsTracker.markUnmounted();
			return;
		}

		if (generation !== this.mountedGeneration || this.host !== container) {
			// Async init can resolve after React has unmounted or remounted the host.
			destroyPixiApplicationSafely(app);
			return;
		}

		const layers = createPixiMediaWallLayers(app);
		attachPixiMediaWallCanvas(
			container,
			app.canvas,
		);

		this.app    = app;
		this.layers = layers;
		this.render();
		this.renderAfterHostPaint(generation);
	}

	public resize(size: MediaWallSize): void {
		const nextSize = this.renderState.setSize(size);

		try {
			this.app?.renderer.resize(
				nextSize.width,
				nextSize.height,
				1,
			);
		} catch {
			this.disableRendering();
		}
	}

	public setSelectedIndexes(indexes: ReadonlySet<number>): void {
		this.renderState.setSelectedIndexes(indexes);
	}

	public setActionTerminalState(state: MediaWallTerminalState | null): void {
		this.renderState.setActionTerminalState(state);
	}

	public setExitingIndex(index: number | null): void {
		this.renderState.setExitingIndex(
			index,
			this.mapItem,
			performance.now(),
		);
	}

	public setItems(range: MediaWallLoadedRange<TItem>): void {
		this.renderState.setItems(range);
	}

	public setScrollTop(scrollTop: number): void {
		this.renderState.setScrollTop(scrollTop);
	}

	public setHoveredIndex(index: number | null): void {
		this.renderState.setHoveredIndex(index);
	}

	public setProjectorHoveredIndex(index: number | null): void {
		this.renderState.setProjectorHoveredIndex(index);
	}

	public setSelectedIndex(index: number | null): void {
		this.renderState.setSelectedIndex(index);
	}

	public setFocusedIndex(index: number | null): void {
		this.renderState.setFocusedIndex(index);
	}

	public setDiagnosticsEnabled(enabled: boolean): void {
		this.diagnosticsEnabled = enabled;
		if (enabled) {
			this.diagnosticsTracker.resetFrameTiming();
		}
	}

	public render(): void {
		if (!this.app || !this.layers || this.isRenderDisabled) {
			return;
		}

		try {
			const renderStart = this.diagnosticsEnabled ? performance.now() : 0;
			const size        = this.renderState.getSize();
			const frameState  = this.renderState.getFrameState();
			const pass        = renderPixiMediaWallRendererPass({
				cardPool:           this.cardPool,
				frameState,
				mapItem:            this.mapItem,
				size,
				thumbnailCache:     this.thumbnailCache,
				thumbnailLoadQueue: this.thumbnailLoadQueue,
				wallLayer:          this.layers.wall,
			});

			// Fast scrolling reuses pooled graphics aggressively; clear explicitly so a transparent
			// canvas never composites stale pixels from the previous frame.
			this.app.renderer.clear({
				clear:      true,
				clearColor: [
					0,
					0,
					0,
					0,
				],
			});
			this.app.render();
			this.cardAnimationScheduler.requestNextFrame(pass.hasActiveCardAnimation);
			if (this.diagnosticsEnabled) {
				recordPixiMediaWallRendererDiagnostics({
					cardPoolSize:       this.cardPool.size,
					diagnosticsTracker: this.diagnosticsTracker,
					frameState,
					lastRenderMs:       performance.now() - renderStart,
					pass,
					renderTimestamp:    renderStart,
					size,
					thumbnailCache:     this.thumbnailCache,
					thumbnailLoadQueue: this.thumbnailLoadQueue,
				});
			}
		} catch {
			// A lost or unavailable graphics adapter can make Pixi internals throw while
			// creating card resources. Disable canvas rendering but keep the virtualized
			// wall host mounted so DB-backed UI behavior remains reachable.
			this.disableRendering();
		}
	}

	public getDiagnostics(): MediaWallDiagnosticsSnapshot {
		return this.diagnosticsTracker.getSnapshot();
	}

	public destroy(): void {
		this.mountedGeneration += 1;
		this.thumbnailLoadQueue.cancelScheduledRender();
		this.cardAnimationScheduler.cancel();
		this.thumbnailLoadQueue.clearPending();
		this.isRenderDisabled = false;
		this.cardPool.destroy();
		if (this.ownsThumbnailCache) {
			this.thumbnailCache.clear();
		}

		destroyPixiApplicationSafely(this.app);

		this.app    = null;
		this.host   = null;
		this.layers = null;
		this.diagnosticsTracker.markUnmounted();
	}

	private renderAfterHostPaint(generation: number): void {
		if (typeof requestAnimationFrame !== "function") {
			return;
		}
		// The first Pixi render can race the browser's initial canvas paint on route entry.
		// Replaying once after layout has painted gives the wall the same visible render path as hover/scroll.
		requestAnimationFrame(() => {
			if (generation !== this.mountedGeneration) {
				return;
			}
			this.render();
		});
	}

	private disableRendering(): void {
		this.isRenderDisabled = true;
		this.cardAnimationScheduler.cancel();
		this.cardPool.destroy();
		destroyPixiApplicationSafely(this.app);
		this.app    = null;
		this.layers = null;
		this.diagnosticsTracker.markUnmounted();
	}
}
