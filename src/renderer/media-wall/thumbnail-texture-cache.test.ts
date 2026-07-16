import type { Texture as PixiTexture } from "pixi.js";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

vi.mock(
	"pixi.js",
	() => ({
		Texture: {
			from: vi.fn(),
		},
	}),
);

const { ThumbnailTextureCache } = await import("./thumbnail-texture-cache");

function createTexture(): PixiTexture {
	return {
		destroyed: false,
		height:    240,
		width:     160,
		destroy:   vi.fn(),
	} as unknown as PixiTexture;
}

function createDeferred<T>() {
	let resolve: ((value: T) => void) | null = null;
	const promise                            = new Promise<T>((deferredResolve) => {
		resolve = deferredResolve;
	});

	return {
		promise,
		resolve: (value: T) => {
			if (!resolve) {
				throw new Error("Deferred promise was not initialized.");
			}
			resolve(value);
		},
	};
}

describe(
	"ThumbnailTextureCache",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
			vi.clearAllMocks();
			vi.unstubAllGlobals();
			Reflect.deleteProperty(
				window,
				"electronAPI",
			);
		});

		it(
			"reuses the same pending texture load for repeated requests",
			async () => {
				const loadCalls: string[] = [];
				const texture             = createTexture();
				const cache               = new ThumbnailTextureCache({
					loadTexture:   async (thumbnailUrl) => {
						loadCalls.push(thumbnailUrl);
						return texture;
					},
					unloadTexture: async () => undefined,
				});

				const firstLoad  = cache.getTexture(
					"media:1",
					"cover-a.jpg",
				);
				const secondLoad = cache.getTexture(
					"media:1",
					"cover-a.jpg",
				);

				expect(await firstLoad).toBe(texture);
				expect(await secondLoad).toBe(texture);
				expect(loadCalls).toEqual([ "cover-a.jpg" ]);
				expect(cache.peekTexture("cover-a.jpg")).toBe(texture);
			},
		);

		it(
			"evicts the least recently used texture that is not visible",
			async () => {
				const unloadedUrls: string[] = [];
				const cache                  = new ThumbnailTextureCache({
					maxEntries:    2,
					loadTexture:   async () => createTexture(),
					unloadTexture: async (thumbnailUrl) => {
						unloadedUrls.push(thumbnailUrl);
					},
				});

				await cache.getTexture(
					"media:1",
					"cover-a.jpg",
				);
				await cache.getTexture(
					"media:2",
					"cover-b.jpg",
				);
				await cache.getTexture(
					"media:3",
					"cover-c.jpg",
				);

				cache.evictUnused(new Set([ "media:3" ]));

				expect(unloadedUrls).toContain("cover-a.jpg");
				expect(cache.peekTexture("cover-a.jpg")).toBeNull();
				expect(cache.peekTexture("cover-c.jpg")).not.toBeNull();
				expect(cache.size).toBe(2);
			},
		);

		it(
			"keeps visible textures when trimming the cache",
			async () => {
				const unloadedUrls: string[] = [];
				const cache                  = new ThumbnailTextureCache({
					maxEntries:    1,
					loadTexture:   async () => createTexture(),
					unloadTexture: async (thumbnailUrl) => {
						unloadedUrls.push(thumbnailUrl);
					},
				});

				await cache.getTexture(
					"media:1",
					"cover-a.jpg",
				);
				await cache.getTexture(
					"media:2",
					"cover-b.jpg",
				);

				cache.evictUnused(new Set([ "media:1" ]));

				expect(unloadedUrls).toContain("cover-b.jpg");
				expect(cache.peekTexture("cover-a.jpg")).not.toBeNull();
			},
		);

		it(
			"unloads cached textures when cleared",
			async () => {
				const unloadedUrls: string[] = [];
				const cache                  = new ThumbnailTextureCache({
					loadTexture:   async () => createTexture(),
					unloadTexture: async (thumbnailUrl) => {
						unloadedUrls.push(thumbnailUrl);
					},
				});

				await cache.getTexture(
					"media:1",
					"cover-a.jpg",
				);
				await cache.getTexture(
					"media:2",
					"cover-b.jpg",
				);

				cache.clear();

				expect(unloadedUrls).toEqual([
					"cover-a.jpg",
					"cover-b.jpg",
				]);
				expect(cache.size).toBe(0);
			},
		);

		it(
			"marks failed loads without retrying on every scroll frame",
			async () => {
				const loadTexture = vi.fn(async () => {
					throw new Error("bridge failed");
				});
				const cache       = new ThumbnailTextureCache({
					loadTexture,
				});

				await expect(cache.getTexture(
					"media:1",
					"cover-a.jpg",
				)).resolves.toBeNull();
				await expect(cache.getTexture(
					"media:1",
					"cover-a.jpg",
				)).resolves.toBeNull();

				expect(loadTexture).toHaveBeenCalledTimes(1);
				expect(cache.peekTexture("cover-a.jpg")).toBeNull();
				expect(cache.failedCount).toBe(1);
			},
		);

		it(
			"unloads a stale pending texture when the same URL is requested again after eviction",
			async () => {
				const firstDeferred  = createDeferred<PixiTexture>();
				const secondDeferred = createDeferred<PixiTexture>();
				const staleTexture   = createTexture();
				const currentTexture = createTexture();
				const unloaded       = vi.fn();
				const cache          = new ThumbnailTextureCache({
					loadTexture:   vi.fn()
													 .mockReturnValueOnce(firstDeferred.promise)
													 .mockReturnValueOnce(secondDeferred.promise),
					unloadTexture: async (thumbnailUrl, texture) => {
						unloaded(
							thumbnailUrl,
							texture,
						);
					},
				});

				const staleLoad = cache.getTexture(
					"media:1",
					"cover-a.jpg",
				);
				cache.clear();
				const currentLoad = cache.getTexture(
					"media:2",
					"cover-a.jpg",
				);

				firstDeferred.resolve(staleTexture);
				await expect(staleLoad).resolves.toBeNull();
				secondDeferred.resolve(currentTexture);
				await expect(currentLoad).resolves.toBe(currentTexture);

				expect(unloaded).toHaveBeenCalledTimes(1);
				expect(unloaded).toHaveBeenCalledWith(
					"cover-a.jpg",
					staleTexture,
				);
				expect(cache.peekTexture("cover-a.jpg")).toBe(currentTexture);
			},
		);
	},
);
