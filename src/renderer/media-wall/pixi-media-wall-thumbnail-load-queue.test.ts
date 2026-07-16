// @vitest-environment node
import type { Texture } from "pixi.js";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { MediaWallItem } from "../types/media-wall";
import { PixiMediaWallThumbnailLoadQueue } from "./pixi-media-wall-thumbnail-load-queue";

function createItem(overrides: Partial<MediaWallItem> = {}): MediaWallItem {
	return {
		id:    "media:1",
		kind:  "library",
		title: "Title",
		...overrides,
	};
}

function createDeferred<T>() {
	let resolve: ((value: T) => void) | null      = null;
	let reject: ((error: unknown) => void) | null = null;
	const promise                                 = new Promise<T>((deferredResolve, deferredReject) => {
		resolve = deferredResolve;
		reject  = deferredReject;
	});

	return {
		promise,
		reject:  (error: unknown) => {
			if (!reject) {
				throw new Error("Deferred promise was not initialized.");
			}
			reject(error);
		},
		resolve: (value: T) => {
			if (!resolve) {
				throw new Error("Deferred promise was not initialized.");
			}
			resolve(value);
		},
	};
}

async function flushPromises(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

describe(
	"PixiMediaWallThumbnailLoadQueue",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
			vi.unstubAllGlobals();
		});

		it(
			"dedupes pending thumbnail loads by URL",
			() => {
				const deferred       = createDeferred<Texture | null>();
				const thumbnailCache = {
					getTexture:       vi.fn(() => deferred.promise),
					needsTextureLoad: vi.fn(() => true),
				};
				const queue          = new PixiMediaWallThumbnailLoadQueue({
					render: vi.fn(),
					thumbnailCache,
				});
				const item           = createItem({ thumbnailUrl: "cover.jpg" });

				expect(queue.queue(item)).toBe(true);
				expect(queue.queue(item)).toBe(false);

				expect(queue.pendingCount).toBe(1);
				expect(thumbnailCache.getTexture).toHaveBeenCalledOnce();
				expect(thumbnailCache.getTexture).toHaveBeenCalledWith(
					"media:1",
					"cover.jpg",
				);
			},
		);

		it(
			"skips empty, cached, or failed thumbnails according to the cache",
			() => {
				const thumbnailCache = {
					getTexture:       vi.fn(),
					needsTextureLoad: vi.fn(() => false),
				};
				const queue          = new PixiMediaWallThumbnailLoadQueue({
					render: vi.fn(),
					thumbnailCache,
				});

				expect(queue.queue(createItem())).toBe(false);
				expect(queue.queue(createItem({ thumbnailUrl: "ready.jpg" }))).toBe(false);
				expect(thumbnailCache.getTexture).not.toHaveBeenCalled();
			},
		);

		it(
			"clears pending state and renders once when a load settles without requestAnimationFrame",
			async () => {
				Reflect.deleteProperty(
					globalThis,
					"requestAnimationFrame",
				);
				const deferred = createDeferred<Texture | null>();
				const render   = vi.fn();
				const queue    = new PixiMediaWallThumbnailLoadQueue({
					render,
					thumbnailCache: {
						getTexture:       vi.fn(() => deferred.promise),
						needsTextureLoad: vi.fn(() => true),
					},
				});

				expect(queue.queue(createItem({ thumbnailUrl: "cover.jpg" }))).toBe(true);
				expect(queue.pendingCount).toBe(1);

				deferred.resolve(null);
				await flushPromises();

				expect(queue.pendingCount).toBe(0);
				expect(render).toHaveBeenCalledOnce();
			},
		);

		it(
			"batches settled loads into one animation-frame render and supports cancellation",
			async () => {
				let nextRafId               = 1;
				const rafCallbacks          = new Map<number, FrameRequestCallback>();
				const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
					const id = nextRafId;
					nextRafId += 1;
					rafCallbacks.set(
						id,
						callback,
					);
					return id;
				});
				const cancelAnimationFrame  = vi.fn((id: number) => {
					rafCallbacks.delete(id);
				});
				vi.stubGlobal(
					"requestAnimationFrame",
					requestAnimationFrame,
				);
				vi.stubGlobal(
					"cancelAnimationFrame",
					cancelAnimationFrame,
				);
				const first  = createDeferred<Texture | null>();
				const second = createDeferred<Texture | null>();
				const render = vi.fn();
				const queue  = new PixiMediaWallThumbnailLoadQueue({
					render,
					thumbnailCache: {
						getTexture:       vi.fn()
																.mockReturnValueOnce(first.promise)
																.mockReturnValueOnce(second.promise),
						needsTextureLoad: vi.fn(() => true),
					},
				});

				queue.queue(createItem({
					id:           "media:1",
					thumbnailUrl: "one.jpg",
				}));
				queue.queue(createItem({
					id:           "media:2",
					thumbnailUrl: "two.jpg",
				}));
				first.resolve(null);
				second.reject(new Error("failed"));
				await flushPromises();

				expect(queue.pendingCount).toBe(0);
				expect(requestAnimationFrame).toHaveBeenCalledOnce();
				expect(render).not.toHaveBeenCalled();

				queue.cancelScheduledRender();

				expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
				expect(rafCallbacks.size).toBe(0);
			},
		);
	},
);
