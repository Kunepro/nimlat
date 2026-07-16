import { Texture } from "pixi.js";
import type {
	MediaWallItem,
	ThumbnailTextureCacheOptions,
} from "../types/media-wall";
import { resolveImageSrc } from "../utils/resolve-image-src";
import {
	loadPixiThumbnailTexture,
	unloadPixiThumbnailTexture,
} from "./pixi-thumbnail-texture-loader";

interface ThumbnailTextureEntry {
	texture: Texture | null;
	promise: Promise<Texture | null> | null;
	itemIds: Set<string>;
	lastUsed: number;
	loadFailed: boolean;
}

interface ThumbnailTextureCacheDiagnostics {
	loadAttemptCount: number;
	loadSuccessCount: number;
	lastLoadUrl?: string;
	lastResolvedLoadUrl?: string;
	lastLoadOutcome?: string;
	lastLoadDetail?: string;
}

const DEFAULT_MAX_TEXTURES = 500;

// Keeps GPU-backed thumbnails bounded while the wall can jump across very large SQLite result sets.
export class ThumbnailTextureCache {
	private readonly maxEntries: number;
	private readonly loadTexture: (thumbnailUrl: string) => Promise<Texture>;
	private readonly unloadTexture: (thumbnailUrl: string, texture: Texture) => Promise<void>;
	private readonly entries     = new Map<string, ThumbnailTextureEntry>();
	private readonly itemIdToUrl = new Map<string, string>();
	private clock                = 0;
	private destroyed            = false;
	private diagnostics: ThumbnailTextureCacheDiagnostics = {
		loadAttemptCount: 0,
		loadSuccessCount: 0,
	};

	public constructor(options: ThumbnailTextureCacheOptions = {}) {
		this.maxEntries    = Math.max(
			1,
			Math.floor(options.maxEntries ?? DEFAULT_MAX_TEXTURES),
		);
		this.loadTexture   = options.loadTexture ?? loadPixiThumbnailTexture;
		this.unloadTexture = options.unloadTexture ?? unloadPixiThumbnailTexture;
	}

	public get size(): number {
		return this.entries.size;
	}

	public get failedCount(): number {
		let failedCount = 0;
		for (const entry of this.entries.values()) {
			if (entry.loadFailed) {
				failedCount += 1;
			}
		}
		return failedCount;
	}

	public getDiagnostics(): ThumbnailTextureCacheDiagnostics {
		return {
			...this.diagnostics,
		};
	}

	public peekTexture(thumbnailUrl?: string): Texture | null {
		if (!thumbnailUrl || this.destroyed) {
			return null;
		}

		const entry = this.entries.get(thumbnailUrl);
		if (!entry?.texture || entry.texture.destroyed) {
			return null;
		}

		entry.lastUsed = this.nextClock();
		return entry.texture;
	}

	public needsTextureLoad(thumbnailUrl?: string): boolean {
		if (!thumbnailUrl || this.destroyed) {
			return false;
		}

		const entry = this.entries.get(thumbnailUrl);
		return !entry || (!entry.texture && !entry.promise && !entry.loadFailed);
	}

	public getTexture(itemId: string, thumbnailUrl?: string): Promise<Texture | null> {
		if (!thumbnailUrl || this.destroyed) {
			return Promise.resolve(null);
		}

		const entry    = this.ensureEntry(
			itemId,
			thumbnailUrl,
		);
		entry.lastUsed = this.nextClock();

		if (entry.texture && !entry.texture.destroyed) {
			return Promise.resolve(entry.texture);
		}

		if (entry.loadFailed) {
			return Promise.resolve(null);
		}

		if (entry.promise) {
			return entry.promise;
		}

		this.diagnostics = {
			...this.diagnostics,
			loadAttemptCount: this.diagnostics.loadAttemptCount + 1,
			lastLoadUrl:      thumbnailUrl,
			lastResolvedLoadUrl: resolveImageSrc(thumbnailUrl),
			lastLoadOutcome:  "loading",
			lastLoadDetail:   undefined,
		};

		entry.promise = this.loadTexture(thumbnailUrl)
			.then((texture) => {
				if (this.destroyed || this.entries.get(thumbnailUrl) !== entry) {
					// A pending load can finish after its cache entry was evicted, or after the
					// same URL was requested again with a fresh entry. Do not attach this stale
					// GPU texture to the new entry; unload it and let the current request win.
					void this.unloadSafely(
						thumbnailUrl,
						texture,
					);
					return null;
				}

				this.diagnostics = {
					...this.diagnostics,
					loadSuccessCount: this.diagnostics.loadSuccessCount + 1,
					lastLoadUrl:      thumbnailUrl,
					lastResolvedLoadUrl: resolveImageSrc(thumbnailUrl),
					lastLoadOutcome:  "ready",
					lastLoadDetail:   texture.destroyed
															? "destroyed"
															: `${ texture.width }x${ texture.height }`,
				};
				entry.texture    = texture;
				entry.promise    = null;
				entry.loadFailed = false;
				entry.lastUsed   = this.nextClock();
				return texture;
			})
			.catch((error: unknown) => {
				if (this.entries.get(thumbnailUrl) === entry) {
					// A failed thumbnail should not be retried every scroll frame. Clearing/reloading the wall resets it.
					entry.promise    = null;
					entry.loadFailed = true;
				}
				this.diagnostics = {
					...this.diagnostics,
					lastLoadUrl:     thumbnailUrl,
					lastResolvedLoadUrl: resolveImageSrc(thumbnailUrl),
					lastLoadOutcome: "failed",
					lastLoadDetail:  error instanceof Error ? error.message : String(error),
				};
				return null;
			});

		return entry.promise;
	}

	public prefetch(items: readonly MediaWallItem[]): void {
		for (const item of items) {
			if (item.thumbnailUrl) {
				void this.getTexture(
					item.id,
					item.thumbnailUrl,
				);
			}
		}
	}

	public evictUnused(visibleItemIds: ReadonlySet<string>): void {
		if (this.entries.size <= this.maxEntries) {
			return;
		}

		const candidates = Array.from(this.entries.entries())
			.filter(([ , entry ]) => !this.hasVisibleItem(
				entry,
				visibleItemIds,
			))
			.sort(([ , left ], [ , right ]) => left.lastUsed - right.lastUsed);

		let remainingToEvict = this.entries.size - this.maxEntries;
		for (const [ thumbnailUrl, entry ] of candidates) {
			if (remainingToEvict <= 0) {
				break;
			}

			this.evictEntry(
				thumbnailUrl,
				entry,
			);
			remainingToEvict -= 1;
		}
	}

	public clear(): void {
		const entries = Array.from(this.entries.entries());
		this.entries.clear();
		this.itemIdToUrl.clear();

		for (const [ thumbnailUrl, entry ] of entries) {
			this.releaseEntryTexture(
				thumbnailUrl,
				entry,
			);
		}
	}

	public destroy(): void {
		this.destroyed = true;
		this.clear();
	}

	private ensureEntry(itemId: string, thumbnailUrl: string): ThumbnailTextureEntry {
		const previousUrl = this.itemIdToUrl.get(itemId);
		if (previousUrl && previousUrl !== thumbnailUrl) {
			this.entries.get(previousUrl)?.itemIds.delete(itemId);
		}
		this.itemIdToUrl.set(
			itemId,
			thumbnailUrl,
		);

		const existingEntry = this.entries.get(thumbnailUrl);
		if (existingEntry) {
			existingEntry.itemIds.add(itemId);
			return existingEntry;
		}

		const entry: ThumbnailTextureEntry = {
			texture:    null,
			promise:    null,
			itemIds:    new Set([ itemId ]),
			lastUsed:   this.nextClock(),
			loadFailed: false,
		};
		this.entries.set(
			thumbnailUrl,
			entry,
		);
		return entry;
	}

	private evictEntry(thumbnailUrl: string, entry: ThumbnailTextureEntry): void {
		if (this.entries.get(thumbnailUrl) !== entry) {
			return;
		}

		this.entries.delete(thumbnailUrl);
		for (const itemId of entry.itemIds) {
			if (this.itemIdToUrl.get(itemId) === thumbnailUrl) {
				this.itemIdToUrl.delete(itemId);
			}
		}
		this.releaseEntryTexture(
			thumbnailUrl,
			entry,
		);
	}

	private releaseEntryTexture(thumbnailUrl: string, entry: ThumbnailTextureEntry): void {
		if (entry.texture && !entry.texture.destroyed) {
			const texture = entry.texture;
			entry.texture = null;
			void this.unloadSafely(
				thumbnailUrl,
				texture,
			);
			return;
		}

		// Pending loads are released by the stale-entry branch in getTexture().
		// Duplicating a release handler here can unload the same texture twice.
	}

	private hasVisibleItem(entry: ThumbnailTextureEntry, visibleItemIds: ReadonlySet<string>): boolean {
		for (const itemId of entry.itemIds) {
			if (visibleItemIds.has(itemId)) {
				return true;
			}
		}
		return false;
	}

	private async unloadSafely(thumbnailUrl: string, texture: Texture): Promise<void> {
		try {
			await this.unloadTexture(
				thumbnailUrl,
				texture,
			);
		} catch {
			// Eviction is best-effort; the renderer must not crash because one cached image cannot be unloaded.
		}
	}

	private nextClock(): number {
		this.clock += 1;
		return this.clock;
	}
}
