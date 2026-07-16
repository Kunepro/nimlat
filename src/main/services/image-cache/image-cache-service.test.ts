// @vitest-environment node
import {
	existsSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const paths = vi.hoisted(() => {
	const root = `${ process.env.TMPDIR ?? "/tmp" }/nimlat-image-cache-test-${ process.pid }`;
	return {
		root,
		data:         `${ root }/data`,
		mediaCache:   `${ root }/data/image-cache/medias`,
		groupCache:   `${ root }/data/image-cache/groups`,
		episodeCache: `${ root }/data/image-cache/episodes`,
	};
});

const imageCacheDbFacade = vi.hoisted(() => ({
	getByCacheKey:        vi.fn(),
	ensurePending:        vi.fn(),
	markReady:            vi.fn(),
	markFailed:           vi.fn(),
	getUserLocalImage:    vi.fn(),
	listByOwnerRole:      vi.fn(() => []),
	deleteByCacheKey:     vi.fn(),
	deleteUserLocalImage: vi.fn(),
}));

const imageGalleryDbFacade = vi.hoisted(() => ({
	getActiveSelection:      vi.fn(),
	getUploadedImageById:    vi.fn(),
	deleteUploadedImageById: vi.fn(),
	clearActiveSelection:    vi.fn(),
}));

const imageCacheEntryReadyBus = vi.hoisted(() => ({
	next: vi.fn(),
}));

const networkStatusReadService = vi.hoisted(() => ({
	isOnline: vi.fn(() => false),
}));

const nativeImageMock = vi.hoisted(() => ({
	createFromBuffer: vi.fn(),
}));

function mockNativeProviderImage(): void {
	nativeImageMock.createFromBuffer.mockReturnValue({
		isEmpty: () => false,
		getSize: () => ({
			width:  1000,
			height: 1500,
		}),
		resize:  vi.fn(() => ({
			toJPEG: vi.fn(() => Buffer.from([
				4,
				5,
				6,
			])),
		})),
		toJPEG:  vi.fn(() => Buffer.from([
			7,
			8,
			9,
		])),
	});
}

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_DATA:                paths.data,
		PATH_MEDIA_IMAGE_CACHE:   paths.mediaCache,
		PATH_GROUP_IMAGE_CACHE:   paths.groupCache,
		PATH_EPISODE_IMAGE_CACHE: paths.episodeCache,
	}),
);

vi.mock(
	"electron",
	() => ({
		nativeImage: nativeImageMock,
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		ImageCacheDbFacade:   imageCacheDbFacade,
		ImageGalleryDbFacade: imageGalleryDbFacade,
	}),
);

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_ImageCacheEntryReady: imageCacheEntryReadyBus,
	}),
);

vi.mock(
	"../network/network-status-read-service",
	() => ({
		NetworkStatusReadService: networkStatusReadService,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: vi.fn(),
		},
	}),
);

vi.mock(
	"./cached-image-metadata",
	() => ({
		deleteCachedImageMetadata:           vi.fn(),
		resolveOrPersistCachedImageMetadata: vi.fn(() => ({
			orientation: "portrait",
		})),
	}),
);

describe(
	"ImageCacheService",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			rmSync(
				paths.root,
				{
					force:     true,
					recursive: true,
				},
			);
			mkdirSync(
				paths.mediaCache,
				{ recursive: true },
			);
			imageGalleryDbFacade.getActiveSelection.mockReturnValue(undefined);
			imageCacheDbFacade.getUserLocalImage.mockReturnValue(undefined);
			imageCacheDbFacade.listByOwnerRole.mockReturnValue([]);
			mockNativeProviderImage();
			networkStatusReadService.isOnline.mockReturnValue(false);
		});

		afterEach(() => {
			rmSync(
				paths.root,
				{
					force:     true,
					recursive: true,
				},
			);
		});

		it(
			"resolves cached provider image paths relative to the current app data folder",
			async () => {
				const { ImageCacheService } = await import("./image-cache-service");
				const remoteUrl             = "https://example.test/cover.jpg";
				const relativePath          = "image-cache/medias/current-cover.jpg";
				const absolutePath          = join(
					paths.data,
					relativePath,
				);
				writeFileSync(
					absolutePath,
					"image-bytes",
				);
				imageCacheDbFacade.getByCacheKey.mockReturnValue({
					remoteUrl,
					localPath: relativePath,
					status:    "ready",
				});

				const resolved = ImageCacheService.resolveMediaDisplayImage(
					123,
					remoteUrl,
				);

				expect(resolved).toEqual({
					displayImageUrl:         absolutePath,
					displayImageSource:      "cached_local",
					displayImageOrientation: "portrait",
				});
			},
		);

		it(
			"uses one optimized provider cache row per owner and role instead of one row per provider URL",
			async () => {
				const { ImageCacheService } = await import("./image-cache-service");
				const remoteUrl             = "https://example.test/cover-large.jpg";
				const oldRelativePath       = "image-cache/medias/old-cover.jpg";
				const oldAbsolutePath       = join(
					paths.data,
					oldRelativePath,
				);
				writeFileSync(
					oldAbsolutePath,
					"old-image-bytes",
				);
				imageCacheDbFacade.getByCacheKey.mockReturnValue(undefined);
				imageCacheDbFacade.listByOwnerRole.mockReturnValue([
					{
						cacheKey:  "media:123:primary:old-url-sized-cache",
						remoteUrl: "https://example.test/cover-medium.jpg",
						localPath: oldRelativePath,
					},
				] as never);

				ImageCacheService.resolveMediaDisplayImage(
					123,
					remoteUrl,
				);

				expect(imageCacheDbFacade.deleteByCacheKey).toHaveBeenCalledWith("media:123:primary:old-url-sized-cache");
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey: "media:123:primary:optimized-card-v1",
					remoteUrl,
				}));
			},
		);

		it(
			"keeps media inspection full-size portrait cache separate from canvas optimized cache",
			async () => {
				const { ImageCacheService } = await import("./image-cache-service");
				const remoteUrl             = "https://example.test/cover-large.jpg";
				imageCacheDbFacade.getByCacheKey.mockReturnValue(undefined);

				const resolved = ImageCacheService.resolveMediaInspectionDisplayImage(
					123,
					remoteUrl,
				);

				expect(resolved.displayImageUrl).toBe(remoteUrl);
				expect(resolved.displayImageFullSizeUrl).toBe(remoteUrl);
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey: "media:123:primary:optimized-card-v1",
					remoteUrl,
				}));
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey: "media:123:primary:full-size-v1",
					remoteUrl,
				}));
			},
		);

		it(
			"clears stale episode provider selections and resolves the current thumbnail",
			async () => {
				const { ImageCacheService } = await import("./image-cache-service");
				imageGalleryDbFacade.getActiveSelection.mockReturnValue({
					sourceKind:  "provider",
					sourceValue: "https://example.test/old-episode-thumb.jpg",
				});
				imageCacheDbFacade.getByCacheKey.mockReturnValue(undefined);
				const currentThumbnailUrl = "https://example.test/current-episode-thumb.jpg";

				const resolved = ImageCacheService.resolveEpisodeDisplayImage(
					123,
					4,
					currentThumbnailUrl,
				);

				expect(imageGalleryDbFacade.clearActiveSelection).toHaveBeenCalledWith(
					"episode",
					"123:4",
					"thumbnail",
				);
				expect(resolved.displayImageUrl).toBe(currentThumbnailUrl);
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey:  "episode:123:4:thumbnail:optimized-card-v1",
					remoteUrl: currentThumbnailUrl,
				}));
			},
		);

		it(
			"keeps uploaded media inspection images full-size while deriving a canvas optimized copy",
			async () => {
				const { ImageCacheService } = await import("./image-cache-service");
				const uploadedPath = join(
					paths.root,
					"uploaded-cover.png",
				);
				writeFileSync(
					uploadedPath,
					"uploaded-image-bytes",
				);
				imageGalleryDbFacade.getActiveSelection.mockReturnValue({
					sourceKind:  "user_upload",
					sourceValue: "77",
				});
				imageGalleryDbFacade.getUploadedImageById.mockReturnValue({
					id:        77,
					ownerKind: "media",
					ownerId:   "123",
					imageRole: "primary",
					localPath: uploadedPath,
					createdAt: 1,
					updatedAt: 1,
				});
				imageCacheDbFacade.getByCacheKey.mockReturnValue(undefined);

				const resolved = ImageCacheService.resolveMediaInspectionDisplayImage(
					123,
					"https://example.test/provider-cover.jpg",
				);

				expect(resolved.displayImageSource).toBe("cached_local");
				expect(resolved.displayImageUrl).not.toBe(uploadedPath);
				expect(resolved.displayImageUrl?.replaceAll(
					"\\",
					"/",
				)).toContain("/image-cache/medias/");
				expect(resolved.displayImageUrl?.endsWith(".jpg")).toBe(true);
				expect(resolved.displayImageFullSizeUrl).toBe(uploadedPath);
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalledTimes(1);
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey:  "upload:77:media:123:primary:optimized-card-v1",
					remoteUrl: `upload:77:${ uploadedPath }`,
				}));
				expect(imageCacheDbFacade.markReady).toHaveBeenCalledWith(
					"upload:77:media:123:primary:optimized-card-v1",
					expect.stringMatching(/^image-cache\/medias\/.*\.jpg$/),
				);
				expect(imageCacheEntryReadyBus.next).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey:      "upload:77:media:123:primary:optimized-card-v1",
					displayTarget: {
						kind:    "media",
						mediaId: 123,
					},
				}));
				expect(nativeImageMock.createFromBuffer).toHaveBeenCalledWith(Buffer.from("uploaded-image-bytes"));
			},
		);

		it(
			"prunes missing uploaded selections with their derived cache entries",
			async () => {
				const { ImageCacheService } = await import("./image-cache-service");
				const uploadedPath          = join(
					paths.root,
					"missing-upload.png",
				);
				const optimizedRelativePath = "image-cache/medias/upload-77-card.jpg";
				const fullSizeRelativePath  = "image-cache/medias/upload-77-full.jpg";
				const optimizedPath         = join(
					paths.data,
					optimizedRelativePath,
				);
				const fullSizePath          = join(
					paths.data,
					fullSizeRelativePath,
				);
				writeFileSync(
					optimizedPath,
					"optimized",
				);
				writeFileSync(
					fullSizePath,
					"full-size",
				);
				imageGalleryDbFacade.getActiveSelection.mockReturnValue({
					sourceKind:  "user_upload",
					sourceValue: "77",
				});
				imageGalleryDbFacade.getUploadedImageById.mockReturnValue({
					id:        77,
					ownerKind: "media",
					ownerId:   "123",
					imageRole: "primary",
					localPath: uploadedPath,
					createdAt: 1,
					updatedAt: 1,
				});
				imageCacheDbFacade.getByCacheKey.mockImplementation((cacheKey: string) => {
					if (cacheKey.endsWith("optimized-card-v1")) {
						return {
							cacheKey,
							localPath: optimizedRelativePath,
						};
					}
					if (cacheKey.endsWith("full-size-v1")) {
						return {
							cacheKey,
							localPath: fullSizeRelativePath,
						};
					}
					return undefined;
				});

				const resolved = ImageCacheService.resolveMediaDisplayImage(
					123,
					"https://example.test/provider-cover.jpg",
				);

				expect(resolved).toEqual({
					displayImageUrl:    "nimlat://broken-media-image-portrait",
					displayImageSource: "broken_local",
				});
				expect(imageGalleryDbFacade.deleteUploadedImageById).toHaveBeenCalledWith(77);
				expect(imageGalleryDbFacade.clearActiveSelection).toHaveBeenCalledWith(
					"media",
					"123",
					"primary",
				);
				expect(imageCacheDbFacade.deleteByCacheKey).toHaveBeenCalledWith("upload:77:media:123:primary:optimized-card-v1");
				expect(imageCacheDbFacade.deleteByCacheKey).toHaveBeenCalledWith("upload:77:media:123:primary:full-size-v1");
				expect(existsSync(optimizedPath)).toBe(false);
				expect(existsSync(fullSizePath)).toBe(false);
			},
		);

		it(
			"persists newly downloaded provider cache paths relative to app data",
			async () => {
				const { ImageCacheService } = await import("./image-cache-service");
				const remoteUrl             = "https://example.test/cover.jpg";
				const responseBytes         = Uint8Array.from([
					0x89,
					0x50,
					0x4e,
					0x47,
					0x0d,
					0x0a,
					0x1a,
					0x0a,
					0x00,
					0x00,
					0x00,
					0x0d,
					0x49,
					0x48,
					0x44,
					0x52,
					0x00,
					0x00,
					0x00,
					0x01,
					0x00,
					0x00,
					0x00,
					0x01,
					0x08,
					0x06,
					0x00,
					0x00,
					0x00,
					0x1f,
					0x15,
					0xc4,
					0x89,
					0x00,
					0x00,
					0x00,
					0x0a,
					0x49,
					0x44,
					0x41,
					0x54,
					0x78,
					0x9c,
					0x63,
					0x00,
					0x01,
					0x00,
					0x00,
					0x05,
					0x00,
					0x01,
					0x0d,
					0x0a,
					0x2d,
					0xb4,
					0x00,
					0x00,
					0x00,
					0x00,
					0x49,
					0x45,
					0x4e,
					0x44,
					0xae,
					0x42,
					0x60,
					0x82,
				]);
				imageCacheDbFacade.getByCacheKey.mockReturnValue(undefined);
				networkStatusReadService.isOnline.mockReturnValue(true);
				vi.stubGlobal(
					"fetch",
					vi.fn(async () => ({
						ok:          true,
						arrayBuffer: async () => responseBytes.buffer,
						headers:     new Headers({ "content-type": "image/jpeg" }),
					})),
				);

				ImageCacheService.resolveMediaDisplayImage(
					123,
					remoteUrl,
				);
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalled();
				expect(imageCacheDbFacade.ensurePending).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey: "media:123:primary:optimized-card-v1",
					remoteUrl,
				}));
				await vi.waitFor(() => {
					expect(fetch).toHaveBeenCalled();
					expect(imageCacheDbFacade.markReady.mock.calls.length + imageCacheDbFacade.markFailed.mock.calls.length).toBeGreaterThan(0);
				});
				expect(imageCacheDbFacade.markFailed).not.toHaveBeenCalled();
				expect(imageCacheDbFacade.markReady).toHaveBeenCalled();

				const persistedPath = imageCacheDbFacade.markReady.mock.calls[ 0 ]?.[ 1 ] as string;
				expect(persistedPath.startsWith("image-cache/medias/")).toBe(true);
				expect(persistedPath.endsWith(".jpg")).toBe(true);
				expect(imageCacheEntryReadyBus.next).toHaveBeenCalledWith(expect.objectContaining({
					cacheKey:      "media:123:primary:optimized-card-v1",
					displayTarget: {
						kind:    "media",
						mediaId: 123,
					},
				}));
				expect(nativeImageMock.createFromBuffer).toHaveBeenCalledWith(Buffer.from(responseBytes));
			},
		);
	},
);
