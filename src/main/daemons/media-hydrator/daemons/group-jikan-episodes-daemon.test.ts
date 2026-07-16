// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

class MockJikanHttpError extends Error {
	constructor(public readonly status: number, message: string) {
		super(message);
	}
}

const facade = {
	getMediasFromGroupJikanEpisodesQueue:          vi.fn(),
	getMediaName:                                  vi.fn(),
	markGroupJikanEpisodesQueueProcessing:         vi.fn(),
	hasMediaEpisodeUpdatesManualPriority:          vi.fn(),
	media:                                         {
		getProviderIds: vi.fn(),
	},
	clearJikanEpisodesSyncState:                   vi.fn(),
	deleteFromGroupJikanEpisodesQueue:             vi.fn(),
	getOrCreateJikanEpisodesSyncState:             vi.fn(),
	upsertJikanEpisodesStagingPage:                vi.fn(),
	updateJikanEpisodesSyncEpisodesProgress:       vi.fn(),
	getNextJikanEpisodeSynopsisCandidate:          vi.fn(),
	applyJikanEpisodeSynopsisToStagingEpisode:     vi.fn(),
	updateJikanEpisodesSyncSynopsisProgress:       vi.fn(),
	applyJikanEpisodeVideoThumbnailsToStagingPage: vi.fn(),
	enqueueJikanEpisodeThumbnailsQueue:            vi.fn(),
	finalizeJikanEpisodesSync:                     vi.fn(),
	markFailedGroupJikanEpisodesQueue:             vi.fn(),
	updateFailedGroupJikanEpisodesQueue:           vi.fn(),
};

const provider = {
	loadEpisodesPageForMedia:      vi.fn(),
	loadEpisodeDetailsForMedia: vi.fn(),
	loadEpisodeVideosPageForMedia: vi.fn(),
};

const progress = {
	publishHydratorTaskStarted:   vi.fn(),
	publishHydratorTaskCompleted: vi.fn(),
	publishHydratorTaskFailed:    vi.fn(),
};

const bus = {
	next: vi.fn(),
};

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_MediaEpisodesListChanged: bus,
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: facade,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainInfo:            vi.fn(),
			logMainServiceError: vi.fn(),
			logHydrationQueueError: vi.fn(),
		},
	}),
);

vi.mock(
	"../../../services/hydrator/hydrator-progress-store",
	() => progress,
);

vi.mock(
	"../../../providers/media-provider-registry",
	() => ({
		MediaProviderRegistry: {
			getJikanEpisodesProvider: () => provider,
		},
	}),
);

vi.mock(
	"../../../api/jikan/jikan-errors",
	() => ({
		JikanHttpError: MockJikanHttpError,
	}),
);

describe(
	"processJikanEpisodesQueue",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			facade.getMediaName.mockReturnValue("Smoke Media");
			facade.hasMediaEpisodeUpdatesManualPriority.mockReturnValue(false);
			facade.media.getProviderIds.mockReturnValue({
				mediaId:   123,
				idAniList: 123,
				idMal:     999,
			});
			facade.getOrCreateJikanEpisodesSyncState.mockReturnValue({
				mediaId:             123,
				syncRunId:           "run-1",
				phase:               "episodes",
				lastEpisodesPage:    0,
				hasNextEpisodesPage: true,
				lastSynopsisEpisodeNumber: 0,
				hasNextSynopsisEpisode:    true,
				startedAt:           1,
				updatedAt:           1,
			});
			facade.finalizeJikanEpisodesSync.mockReturnValue({
				writtenRows: 2,
				deletedRows: 0,
			});
			provider.loadEpisodeDetailsForMedia.mockResolvedValue({
				data: {
					duration: 1440,
					synopsis: "Episode summary",
				},
			});
			facade.getNextJikanEpisodeSynopsisCandidate
				.mockReturnValueOnce({ episodeNumber: 1 })
				.mockReturnValueOnce(null);
		});

		it(
			"hydrates episodes through the provider and finalizes successfully",
			async () => {
				facade.getMediasFromGroupJikanEpisodesQueue.mockReturnValue([ 123 ]);
				provider.loadEpisodesPageForMedia.mockResolvedValue({
					pagination: { has_next_page: false },
					data:       [ { mal_id: 1 } ],
				});
				const { processJikanEpisodesQueue } = await import("./group-jikan-episodes-daemon");

				processJikanEpisodesQueue();
				await vi.waitFor(() => {
					expect(facade.finalizeJikanEpisodesSync).toHaveBeenCalledWith(
						123,
						"run-1",
					);
				});

				expect(provider.loadEpisodesPageForMedia).toHaveBeenCalledWith(
					999,
					1,
					0,
				);
				expect(provider.loadEpisodeDetailsForMedia).toHaveBeenCalledWith(
					999,
					1,
					-100,
				);
				expect(facade.upsertJikanEpisodesStagingPage).toHaveBeenCalledWith(
					123,
					"run-1",
					[
						{
							mal_id: 1,
						},
					],
				);
				expect(facade.updateJikanEpisodesSyncEpisodesProgress).toHaveBeenCalledWith(
					123,
					1,
					false,
				);
				expect(facade.applyJikanEpisodeSynopsisToStagingEpisode).toHaveBeenCalledWith(
					123,
					"run-1",
					1,
					{
						duration: 1440,
						synopsis: "Episode summary",
					},
				);
				expect(facade.updateJikanEpisodesSyncSynopsisProgress).toHaveBeenNthCalledWith(
					1,
					123,
					1,
					true,
				);
				expect(facade.updateJikanEpisodesSyncSynopsisProgress).toHaveBeenNthCalledWith(
					2,
					123,
					1,
					false,
				);
				expect(provider.loadEpisodeVideosPageForMedia).not.toHaveBeenCalled();
				expect(facade.enqueueJikanEpisodeThumbnailsQueue).toHaveBeenCalledWith(
					123,
					{ resetProgress: true },
				);
				expect(facade.deleteFromGroupJikanEpisodesQueue).toHaveBeenCalledWith(123);
				expect(bus.next).toHaveBeenCalledWith({ mediaId: 123 });
				expect(progress.publishHydratorTaskCompleted).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"marks the queue as terminally failed on Jikan 404",
			async () => {
				facade.getMediasFromGroupJikanEpisodesQueue.mockReturnValue([ 123 ]);
				provider.loadEpisodesPageForMedia.mockRejectedValue(new MockJikanHttpError(
					404,
					"Not found",
				));

				const { processJikanEpisodesQueue } = await import("./group-jikan-episodes-daemon");

				processJikanEpisodesQueue();
				await vi.waitFor(() => {
					expect(facade.markFailedGroupJikanEpisodesQueue).toHaveBeenCalledWith(
						123,
						"Not found",
						"jikan_resource_unavailable",
					);
				});

				expect(facade.updateFailedGroupJikanEpisodesQueue).not.toHaveBeenCalled();
				expect(facade.deleteFromGroupJikanEpisodesQueue).not.toHaveBeenCalled();
			},
		);

		it(
			"finalizes episode rows without calling thumbnail enrichment inline",
			async () => {
				facade.getMediasFromGroupJikanEpisodesQueue.mockReturnValue([ 123 ]);
				provider.loadEpisodesPageForMedia.mockResolvedValue({
					pagination: { has_next_page: false },
					data:       [ { mal_id: 1 } ],
				});

				const { processJikanEpisodesQueue } = await import("./group-jikan-episodes-daemon");

				processJikanEpisodesQueue();
				await vi.waitFor(() => {
					expect(facade.finalizeJikanEpisodesSync).toHaveBeenCalledWith(
						123,
						"run-1",
					);
				});

				expect(provider.loadEpisodeVideosPageForMedia).not.toHaveBeenCalled();
				expect(facade.enqueueJikanEpisodeThumbnailsQueue).toHaveBeenCalledWith(
					123,
					{ resetProgress: true },
				);
				expect(facade.updateFailedGroupJikanEpisodesQueue).not.toHaveBeenCalled();
				expect(facade.deleteFromGroupJikanEpisodesQueue).toHaveBeenCalledWith(123);
			},
		);

		it(
			"normalizes non-error episode failures before storing them",
			async () => {
				facade.getMediasFromGroupJikanEpisodesQueue.mockReturnValue([ 123 ]);
				provider.loadEpisodesPageForMedia.mockRejectedValue("network unavailable");

				const { processJikanEpisodesQueue } = await import("./group-jikan-episodes-daemon");

				processJikanEpisodesQueue();
				await vi.waitFor(() => {
					expect(facade.updateFailedGroupJikanEpisodesQueue).toHaveBeenCalledWith(
						123,
						"network unavailable",
						"transient_failure",
					);
				});
			},
		);
	},
);
