// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const facade = {
	media:                             {
		hasFailedHydrationIssue: vi.fn(),
		getLastRefreshAt:        vi.fn(),
		getProviderIds:          vi.fn(),
		getInspection: vi.fn(),
		upsertMedia:             vi.fn(),
	},
	group: {
		getBlueprintFromMedia:  vi.fn(),
		getSummariesByMediaIds: vi.fn(() => []),
	},
	updateGroupDetails:                vi.fn(),
	getMediaEpisodeUpdatesIssue:       vi.fn(),
	getMediaEpisodeUpdatesQueueStatus: vi.fn(),
	getMediaEpisodeUpdatesSupportFacts: vi.fn(),
	retryMediaEpisodeUpdates:          vi.fn(),
};

const userFacade = {
	grouping: {
		listLibraryDisplayItems:  vi.fn(),
		listLibraryFilterOptions: vi.fn(),
		getSummariesByMediaIds:   vi.fn(() => []),
	},
};

const groupReadRepository = {
	listExplorerCards:     vi.fn(),
	listMediaCardsRangeByRef:  vi.fn(),
	getInspectionSummaryByRef: vi.fn(),
	getInspection:         vi.fn(),
	getMediaIds:           vi.fn(),
	getMediaIdsByRef:      vi.fn(),
	getLastRefreshAt:      vi.fn(),
	getLastRefreshAtByRef: vi.fn(),
	getBaseMediaId:        vi.fn(),
};

const provider = {
	getMediaById: vi.fn(),
};

const toaster = {
	info:    vi.fn(),
	error:   vi.fn(),
	success: vi.fn(),
};

const coordinator = {
	handleCatalogMediaMutation: vi.fn(),
};

const imageCacheServiceMock = {
	resolveGroupDisplayImage:   vi.fn(() => ({})),
	resolveMediaDisplayImage:   vi.fn(() => ({})),
	resolveMediaInspectionDisplayImage: vi.fn(() => ({})),
	resolveMediaBannerDisplayImage: vi.fn(() => ({})),
	resolveEpisodeDisplayImage: vi.fn(() => ({})),
};

const mediaInspectionRefreshService = {
	scheduleForInspection: vi.fn(),
};

const networkStatusReadService = {
	isOnline: vi.fn(() => true),
};

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: facade,
		UserDbFacade: userFacade,
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
	"@nimlat/busses/main",
	() => ({
		BUS_HydratorQueueChanges: {
			next: vi.fn(),
		},
	}),
);

vi.mock(
	"../network/network-status-read-service",
	() => ({
		NetworkStatusReadService: networkStatusReadService,
	}),
);

vi.mock(
	"../../providers/media-provider-registry",
	() => ({
		MediaProviderRegistry: {
			getAniListMediaProvider: () => provider,
		},
	}),
);

vi.mock(
	"../../utils/toaster",
	() => ({
		Toaster: toaster,
	}),
);

vi.mock(
	"../group/group-read-repository",
	() => ({
		GroupReadRepository: groupReadRepository,
	}),
);

vi.mock(
	"../library/library-side-effects-coordinator",
	() => ({
		LibrarySideEffectsCoordinator: coordinator,
	}),
);

vi.mock(
	"../image-cache/image-cache-service",
	() => ({
		ImageCacheService: imageCacheServiceMock,
	}),
);

vi.mock(
	"../media/media-inspection-refresh-service",
	() => ({
		MediaInspectionRefreshService: mediaInspectionRefreshService,
	}),
);

describe(
	"listLibraryDisplayItems",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			networkStatusReadService.isOnline.mockReturnValue(true);
		});

		it(
			"delegates to the mixed library read facade with scope",
			async () => {
				userFacade.grouping.listLibraryDisplayItems.mockReturnValue({
					items:      [],
					nextOffset: null,
					total:      0,
				});

				const { listLibraryDisplayItems } = await import("./group-explorer-service");
				const result                      = listLibraryDisplayItems(
					0,
					50,
					"abc",
					"ignored",
				);

				expect(result).toEqual({
					items:      [],
					nextOffset: null,
					total:      0,
				});
				expect(userFacade.grouping.listLibraryDisplayItems).toHaveBeenCalledWith(
					0,
					50,
					"abc",
					"ignored",
					{},
				);
			},
		);

		it(
			"preserves cached image orientation metadata on library items",
			async () => {
				userFacade.grouping.listLibraryDisplayItems.mockReturnValue({
					items:      [
						{
							key:     "media:12",
							kind:    "media",
							mediaId: 12,
							name:    "Landscape poster title",
							lastRefresh: new Date(0).toISOString(),
						},
					],
					nextOffset: null,
					total:      1,
				});
				imageCacheServiceMock.resolveMediaDisplayImage.mockReturnValue({
					displayImageUrl:         "cached-path.jpg",
					displayImageSource:      "cached_local",
					displayImageOrientation: "landscape",
				});

				const { listLibraryDisplayItems } = await import("./group-explorer-service");
				const result = listLibraryDisplayItems(
					0,
					20,
					"",
					"library",
				);

				expect(result.items[ 0 ]).toMatchObject({
					displayImageUrl:         "cached-path.jpg",
					displayImageSource:      "cached_local",
					displayImageOrientation: "landscape",
				});
			},
		);

		it(
			"delegates library filter option reads to the DB facade",
			async () => {
				userFacade.grouping.listLibraryFilterOptions.mockReturnValue({
					genreNames: [ "Action" ],
					tagNames:   [ "Found Family" ],
				});

				const { listLibraryFilterOptions } = await import("./group-explorer-service");

				expect(listLibraryFilterOptions()).toEqual({
					genreNames: [ "Action" ],
					tagNames:   [ "Found Family" ],
				});
				expect(userFacade.grouping.listLibraryFilterOptions).toHaveBeenCalledWith();
			},
		);

		it(
			"returns the media-wall range shape for library and ignored lists",
			async () => {
				userFacade.grouping.listLibraryDisplayItems.mockReturnValue({
					items:      [
						{
							key:         "group:official:7",
							kind:        "group",
							group:       {
								source:  "official",
								groupId: 7,
							},
							name:        "Paged Group",
							imageUrl:    "group.jpg",
							lastRefresh: new Date(0).toISOString(),
						},
					],
					nextOffset: 30,
					total:      42,
				});
				imageCacheServiceMock.resolveGroupDisplayImage.mockReturnValue({
					displayImageUrl: "resolved-group.jpg",
				});

				const { listLibraryDisplayItemsRange } = await import("./group-explorer-service");
				const result                           = listLibraryDisplayItemsRange({
					offset: 10,
					limit:  20,
					search: "pag",
					scope:  "ignored",
				});

				expect(result).toEqual({
					offset: 10,
					total:  42,
					items:  [
						expect.objectContaining({
							key:             "group:official:7",
							displayImageUrl: "resolved-group.jpg",
						}),
					],
				});
				expect(userFacade.grouping.listLibraryDisplayItems).toHaveBeenCalledWith(
					10,
					20,
					"pag",
					"ignored",
					{
						adultFilter: undefined,
						displayMode: undefined,
						genreNames:  undefined,
						tagNames:    undefined,
					},
				);
			},
		);

		it(
			"normalizes invalid library ranges before they reach SQLite",
			async () => {
				userFacade.grouping.listLibraryDisplayItems.mockReturnValue({
					items:      [],
					nextOffset: null,
					total:      0,
				});

				const { listLibraryDisplayItemsRange } = await import("./group-explorer-service");
				expect(listLibraryDisplayItemsRange({
					offset: -12.8,
					limit:  -1,
					search: "",
				})).toEqual({
					offset: 0,
					total:  0,
					items:  [],
				});
				expect(userFacade.grouping.listLibraryDisplayItems).toHaveBeenCalledWith(
					0,
					1,
					"",
					"library",
					expect.any(Object),
				);
			},
		);

		it(
			"uses safe defaults for non-finite library ranges",
			async () => {
				userFacade.grouping.listLibraryDisplayItems.mockReturnValue({
					items:      [],
					nextOffset: null,
					total:      0,
				});

				const { listLibraryDisplayItemsRange } = await import("./group-explorer-service");
				listLibraryDisplayItemsRange({
					offset: Number.NaN,
					limit:  Number.POSITIVE_INFINITY,
					search: "",
				});

				expect(userFacade.grouping.listLibraryDisplayItems).toHaveBeenCalledWith(
					0,
					160,
					"",
					"library",
					expect.any(Object),
				);
			},
		);
	},
);

describe(
	"listGroupMediaWallRange",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"reads a bounded group-media range and resolves media display images",
			async () => {
				groupReadRepository.listMediaCardsRangeByRef.mockReturnValue({
					offset: 40,
					total:  120,
					items:  [
						{
							mediaId:     501,
							name:        "Visible Media",
							imageUrl:    "media.jpg",
							lastRefresh: new Date(0).toISOString(),
							isFilm:      false,
						},
					],
				});
				imageCacheServiceMock.resolveMediaDisplayImage.mockReturnValue({
					displayImageUrl: "resolved-media.jpg",
				});
				const group = {
					source:  "user" as const,
					groupId: 77,
				};

				const { listGroupMediaWallRange } = await import("./group-explorer-service");
				const result                      = listGroupMediaWallRange({
					group,
					offset: 40,
					limit:  20,
					search: "vis",
				});

				expect(result).toEqual({
					offset: 40,
					total:  120,
					items:  [
						expect.objectContaining({
							mediaId:         501,
							displayImageUrl: "resolved-media.jpg",
						}),
					],
				});
				expect(groupReadRepository.listMediaCardsRangeByRef).toHaveBeenCalledWith(
					group,
					40,
					20,
					"vis",
				);
				expect(imageCacheServiceMock.resolveMediaDisplayImage).toHaveBeenCalledWith(
					501,
					"media.jpg",
				);
			},
		);

		it(
			"caps oversized group-media ranges before they reach SQLite",
			async () => {
				groupReadRepository.listMediaCardsRangeByRef.mockReturnValue({
					offset: 42,
					total:  0,
					items:  [],
				});
				const group = {
					source:  "official" as const,
					groupId: 7,
				};

				const { listGroupMediaWallRange } = await import("./group-explorer-service");
				listGroupMediaWallRange({
					group,
					offset: 42.9,
					limit:  Number.MAX_SAFE_INTEGER,
					search: "",
				});

				expect(groupReadRepository.listMediaCardsRangeByRef).toHaveBeenCalledWith(
					group,
					42,
					500,
					"",
				);
			},
		);
	},
);

describe(
	"getGroupInspectionSummary",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"reads one group summary and resolves display image metadata",
			async () => {
				const group = {
					source:  "official" as const,
					groupId: 12,
				};
				groupReadRepository.getInspectionSummaryByRef.mockReturnValue({
					groupId:            12,
					name:               "Summary Group",
					imageUrl:           "group.jpg",
					mediasCount:        20,
					watchedMediasCount: 5,
				});
				imageCacheServiceMock.resolveGroupDisplayImage.mockReturnValue({
					displayImageUrl: "resolved-group.jpg",
				});

				const { getGroupInspectionSummary } = await import("./group-explorer-service");
				expect(getGroupInspectionSummary(group)).toEqual({
					groupId:         12,
					name:            "Summary Group",
					imageUrl:        "group.jpg",
					mediasCount:     20,
					watchedMediasCount: 5,
					displayImageUrl: "resolved-group.jpg",
				});
				expect(groupReadRepository.getInspectionSummaryByRef).toHaveBeenCalledWith(group);
				expect(imageCacheServiceMock.resolveGroupDisplayImage).toHaveBeenCalledWith(
					group,
					"group.jpg",
				);
			},
		);
	},
);

describe(
	"getMediaInspection",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			facade.media.getInspection.mockReturnValue({
				mediaId:       999,
				name:          "Media",
				imageUrl:      "https://example.com/media.jpg",
				bannerImage: "https://example.com/banner.jpg",
				isFilm:        false,
				episodesCount: 0,
				episodes:      [],
			});
		});

		it(
			"schedules an opportunistic background refresh after a media page inspection read",
			async () => {
				imageCacheServiceMock.resolveMediaInspectionDisplayImage.mockReturnValue({
					displayImageUrl:         "media-card-cache.jpg",
					displayImageFullSizeUrl: "media-full-cache.jpg",
				});
				imageCacheServiceMock.resolveMediaBannerDisplayImage.mockReturnValue({
					displayImageUrl:    "media-banner-cache.jpg",
					displayImageSource: "cached_local",
				});
				const { getMediaInspection } = await import("./group-explorer-service");

				const result = getMediaInspection(999);

				expect(result?.mediaId).toBe(999);
				expect(result?.displayImageUrl).toBe("media-card-cache.jpg");
				expect(result?.displayImageFullSizeUrl).toBe("media-full-cache.jpg");
				expect(result?.displayBannerImageUrl).toBe("media-banner-cache.jpg");
				expect(result?.displayBannerImageSource).toBe("cached_local");
				expect(imageCacheServiceMock.resolveMediaInspectionDisplayImage).toHaveBeenCalledWith(
					999,
					"https://example.com/media.jpg",
				);
				expect(imageCacheServiceMock.resolveMediaBannerDisplayImage).toHaveBeenCalledWith(
					999,
					"https://example.com/banner.jpg",
				);
				expect(mediaInspectionRefreshService.scheduleForInspection).toHaveBeenCalledWith(999);
			},
		);

		it(
			"includes current-source group cards on media inspection reads",
			async () => {
				facade.group.getSummariesByMediaIds.mockReturnValue([
					{
						mediaId:  999,
						groupId:  97,
						name:     "Dragon Ball",
						imageUrl: "group-cover.jpg",
					},
				] as never);
				imageCacheServiceMock.resolveGroupDisplayImage.mockReturnValue({
					displayImageUrl:    "cached-group-cover.jpg",
					displayImageSource: "cached_local",
				});
				const { getMediaInspection } = await import("./group-explorer-service");

				const result = getMediaInspection(
					999,
					{ groupSource: "official" },
				);

				expect(result?.groups).toEqual([
					{
						source:             "official",
						groupId:            97,
						name:               "Dragon Ball",
						imageUrl:           "group-cover.jpg",
						displayImageUrl:    "cached-group-cover.jpg",
						displayImageSource: "cached_local",
					},
				]);
				expect(facade.group.getSummariesByMediaIds).toHaveBeenCalledWith([ 999 ]);
				expect(userFacade.grouping.getSummariesByMediaIds).not.toHaveBeenCalled();
				expect(imageCacheServiceMock.resolveGroupDisplayImage).toHaveBeenCalledWith(
					{
						source:  "official",
						groupId: 97,
					},
					"group-cover.jpg",
				);
			},
		);

		it(
			"does not schedule refresh work when the media inspection row is missing",
			async () => {
				facade.media.getInspection.mockReturnValue(null);
				const { getMediaInspection } = await import("./group-explorer-service");

				expect(getMediaInspection(999)).toBeNull();
				expect(mediaInspectionRefreshService.scheduleForInspection).not.toHaveBeenCalled();
			},
		);
	},
);

describe(
	"getMediaEpisodeUpdatesIssue",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			facade.media.getProviderIds.mockReturnValue({
				mediaId:   999,
				idAniList: 999,
				idMal:     999,
			});
			facade.getMediaEpisodeUpdatesSupportFacts.mockReturnValue({
				mediaId:                            999,
				episodesCount:                      12,
				hydratedEpisodesCount:              0,
				hydratedEpisodesWithThumbnailCount: 0,
			});
			facade.getMediaEpisodeUpdatesQueueStatus.mockReturnValue(null);
			facade.getMediaEpisodeUpdatesIssue.mockReturnValue(null);
		});

		it(
			"returns unsupported when the media has no MAL id mapping",
			async () => {
				facade.media.getProviderIds.mockReturnValue({
					mediaId:   999,
					idAniList: 999,
					idMal:     null,
				});

				const { getMediaEpisodeUpdatesIssue } = await import("./group-explorer-service");

				expect(getMediaEpisodeUpdatesIssue(999)).toEqual({
					mediaId:    999,
					status:     "unsupported",
					reason:     "missing_mal_id",
					retryCount: 0,
				});
			},
		);

		it(
			"maps terminal Jikan 404 failures to an unsupported reason",
			async () => {
				facade.getMediaEpisodeUpdatesQueueStatus.mockReturnValue("failed");
				facade.getMediaEpisodeUpdatesIssue.mockReturnValue({
					mediaId:      999,
					reason:       "jikan_resource_unavailable",
					errorMessage: "Not found",
					retryCount:   3,
					lastTriedAt:  123,
				});

				const { getMediaEpisodeUpdatesIssue } = await import("./group-explorer-service");

				expect(getMediaEpisodeUpdatesIssue(999)).toEqual({
					mediaId:      999,
					status:       "unsupported",
					reason:       "jikan_resource_unavailable",
					errorMessage: "Not found",
					retryCount:   3,
					lastTriedAt:  123,
				});
			},
		);

		it(
			"exposes offline as the current retryable reason while a queue item is pending",
			async () => {
				facade.getMediaEpisodeUpdatesQueueStatus.mockReturnValue("pending");
				networkStatusReadService.isOnline.mockReturnValue(false);

				const { getMediaEpisodeUpdatesIssue } = await import("./group-explorer-service");

				expect(getMediaEpisodeUpdatesIssue(999)).toEqual({
					mediaId:    999,
					status:     "pending",
					reason:     "network_unavailable",
					retryCount: 0,
				});
			},
		);

		it(
			"does not report missing video thumbnails as an episode update issue",
			async () => {
				facade.getMediaEpisodeUpdatesSupportFacts.mockReturnValue({
					mediaId:                            999,
					episodesCount:                      12,
					hydratedEpisodesCount:              12,
					hydratedEpisodesWithThumbnailCount: 0,
				});

				const { getMediaEpisodeUpdatesIssue } = await import("./group-explorer-service");

				expect(getMediaEpisodeUpdatesIssue(999)).toBeNull();
			},
		);
	},
);

describe(
	"refreshMedia",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			facade.media.hasFailedHydrationIssue.mockReturnValue(false);
			facade.media.getLastRefreshAt.mockReturnValue(undefined);
			facade.media.getProviderIds.mockReturnValue({
				mediaId:   999,
				idAniList: 999,
				idMal:     999,
			});
		});

		it(
			"refreshes media through the provider registry and upserts the returned payload",
			async () => {
				provider.getMediaById.mockResolvedValue({
					id:    999,
					idMal: 999,
					title: { english: "Smoke Media" },
				});

				const { refreshMedia } = await import("./group-explorer-service");
				const result           = await refreshMedia(999);

				expect(result).toEqual({ success: true });
				expect(provider.getMediaById).toHaveBeenCalledWith(
					999,
					"manual",
					expect.objectContaining({
						idAniList: 999,
						mediaId:   999,
						source:    "media-refresh",
					}),
				);
				expect(facade.media.upsertMedia).toHaveBeenCalledTimes(1);
				expect(toaster.success).toHaveBeenCalled();
			},
		);

		it(
			"returns a failure result when no AniList provider id is available",
			async () => {
				facade.media.getProviderIds.mockReturnValue({
					mediaId:   999,
					idAniList: null,
					idMal:     999,
				});

				const { refreshMedia } = await import("./group-explorer-service");
				const result           = await refreshMedia(999);

				expect(result.success).toBe(false);
				expect(provider.getMediaById).not.toHaveBeenCalled();
				expect(toaster.error).toHaveBeenCalled();
			},
		);

		it(
			"blocks refresh during cooldown when there is no failed hydration issue",
			async () => {
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(1_000_000);
				facade.media.getLastRefreshAt.mockReturnValue(1_000_000 - (9 * 60 * 1000 + 30 * 1000));

				const { refreshMedia } = await import("./group-explorer-service");
				const result           = await refreshMedia(999);

				expect(result).toEqual({
					success: false,
					error:   "Refresh available again in 00:30.",
				});
				expect(provider.getMediaById).not.toHaveBeenCalled();
				expect(toaster.info).toHaveBeenCalledWith("Refresh available again in 00:30.");
			},
		);

		it(
			"bypasses refresh cooldown when the media has a failed hydration issue",
			async () => {
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(1_000_000);
				facade.media.hasFailedHydrationIssue.mockReturnValue(true);
				facade.media.getLastRefreshAt.mockReturnValue(1_000_000 - (9 * 60 * 1000 + 30 * 1000));
				provider.getMediaById.mockResolvedValue({
					id:    999,
					idMal: 999,
					title: { english: "Retried Media" },
				});

				const { refreshMedia } = await import("./group-explorer-service");
				const result           = await refreshMedia(999);

				expect(result).toEqual({ success: true });
				expect(provider.getMediaById).toHaveBeenCalledWith(
					999,
					"manual",
					expect.objectContaining({
						idAniList: 999,
						mediaId:   999,
						source:    "media-refresh",
					}),
				);
				expect(toaster.info).not.toHaveBeenCalled();
			},
		);
	},
);

describe(
	"refreshGroup",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			groupReadRepository.getMediaIdsByRef.mockReturnValue([
				101,
				102,
			]);
			groupReadRepository.getLastRefreshAtByRef.mockReturnValue(undefined);
			groupReadRepository.getBaseMediaId.mockReturnValue(101);
			facade.media.hasFailedHydrationIssue.mockReturnValue(false);
			facade.media.getProviderIds.mockImplementation((mediaId: number) => ({
				mediaId,
				idAniList: mediaId,
				idMal:     mediaId,
			}));
			facade.group.getBlueprintFromMedia.mockReturnValue({
				id:          55,
				baseMediaId: 101,
				name:        "Updated Group",
				description: "Updated Description",
				imageUrl:    "https://example.com/group.jpg",
			});
			provider.getMediaById.mockImplementation(async (mediaId: number) => ({
				id:    mediaId,
				idMal: mediaId,
				title: { english: `Media ${ mediaId }` },
			}));
		});

		it(
			"blocks group refresh during cooldown when no child media has a failed hydration issue",
			async () => {
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(2_000_000);
				groupReadRepository.getLastRefreshAtByRef.mockReturnValue(2_000_000 - (9 * 60 * 1000 + 5 * 1000));

				const { refreshGroup } = await import("./group-explorer-service");
				const result = await refreshGroup({
					source:  "official",
					groupId: 55,
				});

				expect(result).toEqual({
					success: false,
					error:   "Refresh available again in 00:55.",
				});
				expect(provider.getMediaById).not.toHaveBeenCalled();
				expect(toaster.info).toHaveBeenCalledWith("Refresh available again in 00:55.");
			},
		);

		it(
			"bypasses group cooldown when one child media has a failed hydration issue",
			async () => {
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(2_000_000);
				groupReadRepository.getLastRefreshAtByRef.mockReturnValue(2_000_000 - (9 * 60 * 1000 + 5 * 1000));
				facade.media.hasFailedHydrationIssue.mockImplementation((mediaId: number) => mediaId === 102);

				const { refreshGroup } = await import("./group-explorer-service");
				const result = await refreshGroup({
					source:  "official",
					groupId: 55,
				});

				expect(result).toEqual({ success: true });
				expect(provider.getMediaById).toHaveBeenCalledTimes(2);
				expect(facade.updateGroupDetails).not.toHaveBeenCalled();
				expect(toaster.info).not.toHaveBeenCalled();
			},
		);
	},
);
