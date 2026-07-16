// @vitest-environment node
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const facade = {
	media: {
		getAdHocRefreshFacts: vi.fn(),
		upsertMedia:          vi.fn(),
	},
	retryMediaEpisodeUpdates: vi.fn(),
};

const buses = {
	BUS_HydratorQueueChanges: {
		next: vi.fn(),
	},
};

const networkStatusReadService = {
	isOnline: vi.fn(() => true),
};

const provider = {
	getMediaById: vi.fn(),
};

const coordinator = {
	handleCatalogMediaMutation: vi.fn(),
};

const logger = {
	logMainServiceError: vi.fn(),
};

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: facade,
	}),
);

vi.mock(
	"@nimlat/busses/main",
	() => buses,
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
		LoggerUtils: logger,
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
	"../library/library-side-effects-coordinator",
	() => ({
		LibrarySideEffectsCoordinator: coordinator,
	}),
);

function flushAsync(): Promise<void> {
	return new Promise(resolve => setImmediate(resolve));
}

describe(
	"MediaInspectionRefreshService",
	() => {
		const now = 2_000_000_000;

		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			vi.spyOn(
				Date,
				"now",
			).mockReturnValue(now);
			networkStatusReadService.isOnline.mockReturnValue(true);
			provider.getMediaById.mockResolvedValue({
				id:    999,
				idMal: 999,
				title: { english: "Updated Media" },
			});
			facade.media.getAdHocRefreshFacts.mockReturnValue({
				mediaId:                    999,
				idAniList:                  999,
				idMal:                      999,
				status:                     "FINISHED",
				episodesCount:              12,
				nextAiringEpisode:          null,
				nextAiringEpisodeJson:      null,
				lastUpdatedAt:              now,
				hydratedEpisodesCount:      12,
				jikanEpisodesQueueStatus:   null,
				jikanEpisodesFailureReason: null,
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"does not refresh active media solely because local metadata is old",
			async () => {
				facade.media.getAdHocRefreshFacts.mockReturnValue({
					mediaId:                    999,
					idAniList:                  999,
					idMal:                      999,
					status:                     "RELEASING",
					episodesCount:              12,
					nextAiringEpisode:          null,
					nextAiringEpisodeJson:      null,
					lastUpdatedAt:              now - 25 * 60 * 60 * 1000,
					hydratedEpisodesCount:      12,
					jikanEpisodesQueueStatus:   null,
					jikanEpisodesFailureReason: null,
				});
				const { MediaInspectionRefreshService } = await import("./media-inspection-refresh-service");

				MediaInspectionRefreshService.scheduleForInspection(999);
				await flushAsync();

				expect(provider.getMediaById).not.toHaveBeenCalled();
				expect(facade.media.upsertMedia).not.toHaveBeenCalled();
			},
		);

		it(
			"keeps repeated inspection navigation inside the duplicate-call suppression window",
			async () => {
				const airingAtMs = now - 60_000;
				facade.media.getAdHocRefreshFacts.mockReturnValue({
					mediaId:                    999,
					idAniList:                  999,
					idMal:                      999,
					status:                     "RELEASING",
					episodesCount:              12,
					nextAiringEpisode:          Math.floor(airingAtMs / 1000),
					nextAiringEpisodeJson:      null,
					lastUpdatedAt:              now - 2 * 60 * 60 * 1000,
					hydratedEpisodesCount:      12,
					jikanEpisodesQueueStatus:   null,
					jikanEpisodesFailureReason: null,
				});
				const { MediaInspectionRefreshService } = await import("./media-inspection-refresh-service");

				MediaInspectionRefreshService.scheduleForInspection(999);
				MediaInspectionRefreshService.scheduleForInspection(999);
				await flushAsync();

				expect(provider.getMediaById).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"queues priority episode hydration when expected Jikan episodes are missing",
			async () => {
				facade.media.getAdHocRefreshFacts.mockReturnValue({
					mediaId:                    999,
					idAniList:                  999,
					idMal:                      999,
					status:                     "FINISHED",
					episodesCount:              12,
					nextAiringEpisode:          null,
					nextAiringEpisodeJson:      null,
					lastUpdatedAt:              now,
					hydratedEpisodesCount:      3,
					jikanEpisodesQueueStatus:   null,
					jikanEpisodesFailureReason: null,
				});
				const { MediaInspectionRefreshService } = await import("./media-inspection-refresh-service");

				MediaInspectionRefreshService.scheduleForInspection(999);
				await flushAsync();

				expect(facade.retryMediaEpisodeUpdates).toHaveBeenCalledWith(999);
				expect(buses.BUS_HydratorQueueChanges.next).toHaveBeenCalled();
				expect(provider.getMediaById).not.toHaveBeenCalled();
			},
		);

		it(
			"does not requeue episodes after Jikan successfully synced an empty snapshot",
			async () => {
				facade.media.getAdHocRefreshFacts.mockReturnValue({
					mediaId:                           999,
					idAniList:                         999,
					idMal:                             999,
					status:                            "FINISHED",
					episodesCount:                     1,
					nextAiringEpisode:                 null,
					nextAiringEpisodeJson:             null,
					lastUpdatedAt:                     now,
					hydratedEpisodesCount:             0,
					jikanEpisodesQueueStatus:          null,
					jikanEpisodesFailureReason:        null,
					jikanEpisodesCoverageStatus:       "empty",
					jikanEpisodesProviderEpisodeCount: 0,
				});
				const { MediaInspectionRefreshService } = await import("./media-inspection-refresh-service");

				MediaInspectionRefreshService.scheduleForInspection(999);
				await flushAsync();

				expect(facade.retryMediaEpisodeUpdates).not.toHaveBeenCalled();
				expect(provider.getMediaById).not.toHaveBeenCalled();
			},
		);

		it(
			"does not retry terminal Jikan episode failures automatically",
			async () => {
				facade.media.getAdHocRefreshFacts.mockReturnValue({
					mediaId:                    999,
					idAniList:                  999,
					idMal:                      999,
					status:                     "FINISHED",
					episodesCount:              12,
					nextAiringEpisode:          null,
					nextAiringEpisodeJson:      null,
					lastUpdatedAt:              now,
					hydratedEpisodesCount:      12,
					jikanEpisodesQueueStatus:   "failed",
					jikanEpisodesFailureReason: "jikan_resource_unavailable",
				});
				const { MediaInspectionRefreshService } = await import("./media-inspection-refresh-service");

				MediaInspectionRefreshService.scheduleForInspection(999);
				await flushAsync();

				expect(facade.retryMediaEpisodeUpdates).not.toHaveBeenCalled();
				expect(provider.getMediaById).not.toHaveBeenCalled();
			},
		);

		it(
			"refreshes recently due airing media when the local row predates the airing time",
			async () => {
				const airingAtMs = now - 60_000;
				facade.media.getAdHocRefreshFacts.mockReturnValue({
					mediaId:                    999,
					idAniList:                  999,
					idMal:                      999,
					status:                     "FINISHED",
					episodesCount:              12,
					nextAiringEpisode:          Math.floor(airingAtMs / 1000),
					nextAiringEpisodeJson:      null,
					lastUpdatedAt:              now - 2 * 60 * 60 * 1000,
					hydratedEpisodesCount:      12,
					jikanEpisodesQueueStatus:   null,
					jikanEpisodesFailureReason: null,
				});
				const { MediaInspectionRefreshService } = await import("./media-inspection-refresh-service");

				MediaInspectionRefreshService.scheduleForInspection(999);
				await flushAsync();

				expect(provider.getMediaById).toHaveBeenCalledWith(
					999,
					"background",
					expect.objectContaining({
						idAniList: 999,
						mediaId:   999,
						source:    "media-inspection-ad-hoc-refresh",
					}),
				);
				expect(facade.media.upsertMedia).toHaveBeenCalledWith({
					id:    999,
					idMal: 999,
					title: { english: "Updated Media" },
				});
			},
		);
	},
);
