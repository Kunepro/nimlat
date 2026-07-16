// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const getImageGallerySource         = vi.hoisted(() => vi.fn());
const getEpisodeDetailsSnapshot     = vi.hoisted(() => vi.fn());
const getImagePreviews = vi.hoisted(() => vi.fn());
const getActiveSelection             = vi.hoisted(() => vi.fn());
const listUploadedImages             = vi.hoisted(() => vi.fn());
const getUploadedImageById           = vi.hoisted(() => vi.fn());
const deleteUploadedImageById        = vi.hoisted(() => vi.fn());
const clearActiveSelection           = vi.hoisted(() => vi.fn());
const setActiveSelection            = vi.hoisted(() => vi.fn());
const createUploadedImage           = vi.hoisted(() => vi.fn());
const deleteOwnedMediaImageIfPresent = vi.hoisted(() => vi.fn());
const storeMediaImage               = vi.hoisted(() => vi.fn());
const imageDisplayTargetChangedNext = vi.hoisted(() => vi.fn());
const resolveProviderGalleryCandidate = vi.hoisted(() => vi.fn());
const deleteUploadedImageCache        = vi.hoisted(() => vi.fn());
const existsSyncMock                = vi.hoisted(() => vi.fn());

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade:        {
			media: {
				getImageGallerySource,
				getEpisodeDetailsSnapshot,
				getImagePreviews,
			},
		},
		ImageGalleryDbFacade: {
			getActiveSelection,
			listUploadedImages,
			getUploadedImageById,
			deleteUploadedImageById,
			clearActiveSelection,
			setActiveSelection,
			createUploadedImage,
		},
	}),
);

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_ImageDisplayTargetChanged: {
			next: imageDisplayTargetChangedNext,
		},
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
	"../../utils/toaster",
	() => ({
		Toaster: {
			error: vi.fn(),
		},
	}),
);

vi.mock(
	"../group/group-image-storage-service",
	() => ({
		deleteOwnedEpisodeImageIfPresent: vi.fn(),
		deleteOwnedGroupImageIfPresent:   vi.fn(),
		deleteOwnedMediaImageIfPresent,
		storeEpisodeImage:                vi.fn(),
		storeGroupImage:                  vi.fn(),
		storeMediaImage,
	}),
);

vi.mock(
	"node:fs",
	() => ({
		existsSync: existsSyncMock,
	}),
);

vi.mock(
	"../group/group-read-repository",
	() => ({
		GroupReadRepository: {
			getInspectionSummaryByRef: vi.fn(),
			getMediaIdsByRef:          vi.fn(),
		},
	}),
);

vi.mock(
	"./image-cache-service",
	() => ({
		ImageCacheService: {
			resolveProviderGalleryCandidate,
			resolveUploadedGalleryCandidate: vi.fn(),
			deleteUploadedImageCache,
		},
	}),
);

describe(
	"ImageGalleryService.getMediaImageGallery",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			getActiveSelection.mockReturnValue(undefined);
			listUploadedImages.mockReturnValue([]);
			getUploadedImageById.mockReturnValue(null);
			existsSyncMock.mockReturnValue(true);
			resolveProviderGalleryCandidate.mockImplementation((
				_ownerKind: string,
				_ownerId: string,
				_imageRole: string,
				remoteUrl?: string,
			) => ({
				displayImageUrl:    remoteUrl
															? `/cache/${ encodeURIComponent(remoteUrl) }`
															: undefined,
				displayImageSource: "cached_local",
			}));
		});

		it(
			"builds hydrated media portrait and banner candidates from compact image source data",
			async () => {
				getImageGallerySource.mockReturnValue({
					mediaId:     123,
					imageUrl:    "https://img.example.test/portrait-xl.jpg",
					bannerImage: "https://img.example.test/banner.jpg",
				});

				const { ImageGalleryService } = await import("./image-gallery-service");
				const gallery                 = ImageGalleryService.getMediaImageGallery(123);

				expect(getImageGallerySource).toHaveBeenCalledWith(123);
				expect(getImagePreviews).not.toHaveBeenCalled();
				expect(gallery.tabs).toHaveLength(2);
				expect(gallery.tabs[ 0 ]?.candidates).toEqual([
					expect.objectContaining({
						candidateKey:    "provider:https://img.example.test/portrait-xl.jpg",
						role:            "portrait",
						sourceKind:      "provider",
						label:           "Current media portrait",
						imageUrl:        "https://img.example.test/portrait-xl.jpg",
						displayImageUrl: "/cache/https%3A%2F%2Fimg.example.test%2Fportrait-xl.jpg",
					}),
				]);
				expect(gallery.tabs[ 1 ]?.candidates).toEqual([
					expect.objectContaining({
						candidateKey:    "provider:https://img.example.test/banner.jpg",
						role:            "banner",
						sourceKind:      "provider",
						label:           "Current media banner",
						imageUrl:        "https://img.example.test/banner.jpg",
						displayImageUrl: "/cache/https%3A%2F%2Fimg.example.test%2Fbanner.jpg",
					}),
				]);
			},
		);

		it(
			"builds episode thumbnail candidates from the compact episode snapshot",
			async () => {
				getEpisodeDetailsSnapshot.mockReturnValue({
					mediaId:       123,
					episodeNumber: 4,
					thumbnail:     "https://img.example.test/episode.jpg",
				});

				const { ImageGalleryService } = await import("./image-gallery-service");
				const gallery                 = ImageGalleryService.getEpisodeImageGallery(
					123,
					4,
				);

				expect(getEpisodeDetailsSnapshot).toHaveBeenCalledWith(
					123,
					4,
				);
				expect(gallery.tabs).toHaveLength(1);
				expect(gallery.tabs[ 0 ]?.candidates).toEqual([
					expect.objectContaining({
						candidateKey:    "provider:https://img.example.test/episode.jpg",
						role:            "thumbnail",
						sourceKind:      "provider",
						label:           "Current episode thumbnail",
						imageUrl:        "https://img.example.test/episode.jpg",
						displayImageUrl: "/cache/https%3A%2F%2Fimg.example.test%2Fepisode.jpg",
					}),
				]);
			},
		);

		it(
			"keeps the active episode provider thumbnail visible when source data is empty",
			async () => {
				getEpisodeDetailsSnapshot.mockReturnValue({
					mediaId:       123,
					episodeNumber: 4,
					thumbnail:     undefined,
				});
				getActiveSelection.mockReturnValue({
					ownerKind:   "episode",
					ownerId:     "123:4",
					imageRole:   "thumbnail",
					sourceKind:  "provider",
					sourceValue: "https://img.example.test/selected-episode.jpg",
				});

				const { ImageGalleryService } = await import("./image-gallery-service");
				const gallery                 = ImageGalleryService.getEpisodeImageGallery(
					123,
					4,
				);

				expect(gallery.tabs[ 0 ]?.activeCandidateKey).toBe("provider:https://img.example.test/selected-episode.jpg");
				expect(gallery.tabs[ 0 ]?.candidates).toEqual([
					expect.objectContaining({
						candidateKey:    "provider:https://img.example.test/selected-episode.jpg",
						role:            "thumbnail",
						sourceKind:      "provider",
						label:           "Selected thumbnail",
						imageUrl:        "https://img.example.test/selected-episode.jpg",
						displayImageUrl: "/cache/https%3A%2F%2Fimg.example.test%2Fselected-episode.jpg",
					}),
				]);
			},
		);

		it(
			"deletes media uploaded images and clears the active upload selection",
			async () => {
				getUploadedImageById.mockReturnValue({
					id:        7,
					ownerKind: "media",
					ownerId:   "123",
					imageRole: "primary",
					localPath: "/app-data/user-images/media/upload.jpg",
					createdAt: 1,
					updatedAt: 1,
				});
				getActiveSelection.mockReturnValue({
					ownerKind:   "media",
					ownerId:     "123",
					imageRole:   "primary",
					sourceKind:  "user_upload",
					sourceValue: "7",
				});

				const { ImageGalleryService } = await import("./image-gallery-service");
				const result                  = ImageGalleryService.deleteMediaUploadedImage(
					123,
					"upload:7",
				);

				expect(result).toEqual({ success: true });
				expect(clearActiveSelection).toHaveBeenCalledWith(
					"media",
					"123",
					"primary",
				);
				expect(deleteUploadedImageById).toHaveBeenCalledWith(7);
				expect(deleteUploadedImageCache).toHaveBeenCalledWith(expect.objectContaining({
					id:        7,
					ownerKind: "media",
					ownerId:   "123",
					imageRole: "primary",
				}));
				expect(deleteOwnedMediaImageIfPresent).toHaveBeenCalledWith("/app-data/user-images/media/upload.jpg");
				expect(imageDisplayTargetChangedNext).toHaveBeenCalledWith({
					displayTarget: {
						kind:    "media",
						mediaId: 123,
					},
					reason:        "gallery-upload-changed",
				});
			},
		);

		it(
			"persists provider, upload, and cleared selections without publishing gallery events",
			async () => {
				const { ImageGalleryService } = await import("./image-gallery-service");

				ImageGalleryService.applyMediaSelections(
					123,
					[
						{
							role:         "portrait",
							candidateKey: "provider:https://img.example.test/portrait.jpg",
						},
						{
							role:         "banner",
							candidateKey: "upload:7",
						},
						{
							role: "thumbnail",
						},
					],
				);

				expect(setActiveSelection).toHaveBeenCalledWith({
					ownerKind:   "media",
					ownerId:     "123",
					imageRole:   "primary",
					sourceKind:  "provider",
					sourceValue: "https://img.example.test/portrait.jpg",
				});
				expect(setActiveSelection).toHaveBeenCalledWith({
					ownerKind:   "media",
					ownerId:     "123",
					imageRole:   "banner",
					sourceKind:  "user_upload",
					sourceValue: "7",
				});
				expect(clearActiveSelection).toHaveBeenCalledWith(
					"media",
					"123",
					"thumbnail",
				);
				expect(imageDisplayTargetChangedNext).not.toHaveBeenCalled();
			},
		);

		it(
			"rolls back a stored upload file if image-gallery metadata creation fails",
			async () => {
				storeMediaImage.mockReturnValue("/app-data/user-images/media/new-upload.jpg");
				createUploadedImage.mockImplementation(() => {
					throw new Error("metadata insert failed");
				});

				const { ImageGalleryService } = await import("./image-gallery-service");
				const result                  = ImageGalleryService.uploadMediaImage(
					123,
					"portrait",
					"/source/new-upload.jpg",
				);

				expect(result).toEqual({
					success: false,
					error:   "metadata insert failed",
				});
				expect(deleteOwnedMediaImageIfPresent).toHaveBeenCalledWith("/app-data/user-images/media/new-upload.jpg");
				expect(imageDisplayTargetChangedNext).not.toHaveBeenCalled();
			},
		);

		it(
			"prunes missing uploaded files from gallery read models and clears the active upload",
			async () => {
				getImageGallerySource.mockReturnValue({
					mediaId:     123,
					imageUrl:    undefined,
					bannerImage: undefined,
				});
				getActiveSelection
					.mockReturnValueOnce({
						ownerKind:   "media",
						ownerId:     "123",
						imageRole:   "primary",
						sourceKind:  "user_upload",
						sourceValue: "7",
					})
					.mockReturnValueOnce(undefined);
				listUploadedImages
					.mockReturnValueOnce([
						{
							id:        7,
							ownerKind: "media",
							ownerId:   "123",
							imageRole: "primary",
							localPath: "/app-data/user-images/media/missing.jpg",
							createdAt: 1,
							updatedAt: 1,
						},
					])
					.mockReturnValueOnce([]);
				existsSyncMock.mockReturnValue(false);

				const { ImageGalleryService } = await import("./image-gallery-service");
				const gallery                 = ImageGalleryService.getMediaImageGallery(123);

				expect(gallery.tabs[ 0 ]?.candidates).toEqual([]);
				expect(deleteUploadedImageCache).toHaveBeenCalledWith(expect.objectContaining({
					id:        7,
					ownerKind: "media",
					ownerId:   "123",
					imageRole: "primary",
				}));
				expect(deleteUploadedImageById).toHaveBeenCalledWith(7);
				expect(clearActiveSelection).toHaveBeenCalledWith(
					"media",
					"123",
					"primary",
				);
			},
		);

		it(
			"rejects deleting provider candidates",
			async () => {
				const { ImageGalleryService } = await import("./image-gallery-service");
				const result                  = ImageGalleryService.deleteMediaUploadedImage(
					123,
					"provider:https://img.example.test/portrait.jpg",
				);

				expect(result.success).toBe(false);
				expect(deleteUploadedImageById).not.toHaveBeenCalled();
				expect(deleteOwnedMediaImageIfPresent).not.toHaveBeenCalled();
				expect(imageDisplayTargetChangedNext).not.toHaveBeenCalled();
			},
		);

		it(
			"publishes image-domain events for gallery selection saves",
			async () => {
				const { ImageGalleryService } = await import("./image-gallery-service");

				expect(ImageGalleryService.saveMediaImageGallery({
					mediaId:    123,
					selections: [],
				})).toEqual({ success: true });
				expect(ImageGalleryService.saveGroupImageGallery({
					group:      {
						source:  "official",
						groupId: 456,
					},
					selections: [],
				})).toEqual({ success: true });
				expect(ImageGalleryService.saveEpisodeImageGallery({
					mediaId:       789,
					episodeNumber: 1,
					selections:    [],
				})).toEqual({ success: true });

				expect(imageDisplayTargetChangedNext).toHaveBeenCalledWith({
					displayTarget: {
						kind:    "media",
						mediaId: 123,
					},
					reason:        "gallery-selection-changed",
				});
				expect(imageDisplayTargetChangedNext).toHaveBeenCalledWith({
					displayTarget: {
						kind:  "group",
						group: {
							source:  "official",
							groupId: 456,
						},
					},
					reason:        "gallery-selection-changed",
				});
				expect(imageDisplayTargetChangedNext).toHaveBeenCalledWith({
					displayTarget: {
						kind:    "episode",
						mediaId: 789,
					},
					reason:        "gallery-selection-changed",
				});
			},
		);
	},
);
