import type { MediaWallItem } from "../types/media-wall";
import { cancelMediaWallAnimationFrame } from "./pixi-media-wall-renderer-runtime";
import type { ThumbnailTextureCache } from "./thumbnail-texture-cache";

interface PixiMediaWallThumbnailLoadQueueOptions {
	render: () => void;
	thumbnailCache: Pick<ThumbnailTextureCache, "getTexture" | "needsTextureLoad">;
}

// Owns the async thumbnail-loading queue for the wall renderer. The renderer asks
// whether a visible item should start loading; this object dedupes by URL and
// batches completion repaint work into one animation frame.
export class PixiMediaWallThumbnailLoadQueue {
	private readonly pendingThumbnailUrls     = new Set<string>();
	private readonly render: () => void;
	private readonly thumbnailCache: Pick<ThumbnailTextureCache, "getTexture" | "needsTextureLoad">;
	private thumbnailRenderRaf: number | null = null;

	public constructor({
											 render,
											 thumbnailCache,
										 }: PixiMediaWallThumbnailLoadQueueOptions) {
		this.render         = render;
		this.thumbnailCache = thumbnailCache;
	}

	public get pendingCount(): number {
		return this.pendingThumbnailUrls.size;
	}

	public queue(item: MediaWallItem): boolean {
		const { thumbnailUrl } = item;
		if (!thumbnailUrl || this.pendingThumbnailUrls.has(thumbnailUrl) || !this.thumbnailCache.needsTextureLoad(thumbnailUrl)) {
			return false;
		}

		// Bound the first wave of image decoding/fetch work; each completion schedules a fresh render
		// that can start the next thumbnail.
		this.pendingThumbnailUrls.add(thumbnailUrl);
		this.thumbnailCache.getTexture(
			item.id,
			thumbnailUrl,
		).then(() => {
			this.resolvePendingLoad(thumbnailUrl);
			return null;
		}).catch(() => {
			this.resolvePendingLoad(thumbnailUrl);
		});
		return true;
	}

	public clearPending(): void {
		this.pendingThumbnailUrls.clear();
	}

	public cancelScheduledRender(): void {
		this.thumbnailRenderRaf = cancelMediaWallAnimationFrame(this.thumbnailRenderRaf);
	}

	private resolvePendingLoad(thumbnailUrl: string): void {
		this.pendingThumbnailUrls.delete(thumbnailUrl);
		this.scheduleRender();
	}

	private scheduleRender(): void {
		if (typeof requestAnimationFrame !== "function") {
			this.render();
			return;
		}
		if (this.thumbnailRenderRaf !== null) {
			return;
		}

		this.thumbnailRenderRaf = requestAnimationFrame(() => {
			this.thumbnailRenderRaf = null;
			this.render();
		});
	}
}
