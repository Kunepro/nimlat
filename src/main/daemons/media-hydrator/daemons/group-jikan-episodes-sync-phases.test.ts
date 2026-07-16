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
	upsertJikanEpisodesStagingPage:            vi.fn(),
	updateJikanEpisodesSyncEpisodesProgress:   vi.fn(),
	getNextJikanEpisodeSynopsisCandidate:      vi.fn(),
	applyJikanEpisodeSynopsisToStagingEpisode: vi.fn(),
	updateJikanEpisodesSyncSynopsisProgress:   vi.fn(),
};

const provider = {
	loadEpisodesPageForMedia:   vi.fn(),
	loadEpisodeDetailsForMedia: vi.fn(),
};

const progress = {
	publishHydratorTaskStarted: vi.fn(),
};

const logMainInfo = vi.fn();

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
			logMainInfo,
		},
	}),
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
	"../../../services/hydrator/hydrator-progress-store",
	() => progress,
);

vi.mock(
	"../../../api/jikan/jikan-errors",
	() => ({
		JikanHttpError: MockJikanHttpError,
	}),
);

function contextFixture() {
	return {
		mediaId:         123,
		malId:           999,
		mediaTitle:      "Smoke Media",
		taskId:          "jikan-episodes:123",
		requestPriority: 10,
	};
}

function syncStateFixture(overrides: Partial<import("./group-jikan-episodes-sync-phases").JikanEpisodesSyncState> = {}): import("./group-jikan-episodes-sync-phases").JikanEpisodesSyncState {
	return {
		mediaId:                   123,
		syncRunId:                 "run-1",
		phase:                     "episodes",
		lastEpisodesPage:          0,
		hasNextEpisodesPage:       true,
		lastSynopsisEpisodeNumber: 0,
		hasNextSynopsisEpisode:    true,
		startedAt:                 1,
		updatedAt:                 1,
		...overrides,
	};
}

describe(
	"group-jikan-episodes sync phases",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"persists an episodes page and advances to synopsis phase when pagination ends",
			async () => {
				provider.loadEpisodesPageForMedia.mockResolvedValue({
					pagination: { has_next_page: false },
					data:       [ { mal_id: 1 } ],
				});

				const { processJikanEpisodesPhase } = await import("./group-jikan-episodes-sync-phases");
				const nextState                     = await processJikanEpisodesPhase(
					contextFixture(),
					syncStateFixture(),
				);

				expect(provider.loadEpisodesPageForMedia).toHaveBeenCalledWith(
					999,
					1,
					10,
				);
				expect(facade.upsertJikanEpisodesStagingPage).toHaveBeenCalledWith(
					123,
					"run-1",
					[ { mal_id: 1 } ],
				);
				expect(facade.updateJikanEpisodesSyncEpisodesProgress).toHaveBeenCalledWith(
					123,
					1,
					false,
				);
				expect(nextState).toEqual(expect.objectContaining({
					phase:               "synopses",
					lastEpisodesPage:    1,
					hasNextEpisodesPage: false,
				}));
			},
		);

		it(
			"skips one unavailable synopsis detail and still advances the synopsis cursor",
			async () => {
				facade.getNextJikanEpisodeSynopsisCandidate
					.mockReturnValueOnce({ episodeNumber: 7 })
					.mockReturnValueOnce(null);
				provider.loadEpisodeDetailsForMedia.mockRejectedValue(new MockJikanHttpError(
					404,
					"episode not found",
				));

				const { processJikanSynopsesPhase } = await import("./group-jikan-episodes-sync-phases");
				const nextState                     = await processJikanSynopsesPhase(
					contextFixture(),
					syncStateFixture({
						phase: "synopses",
					}),
				);

				expect(provider.loadEpisodeDetailsForMedia).toHaveBeenCalledWith(
					999,
					7,
					-90,
				);
				expect(facade.applyJikanEpisodeSynopsisToStagingEpisode).not.toHaveBeenCalled();
				expect(facade.updateJikanEpisodesSyncSynopsisProgress).toHaveBeenNthCalledWith(
					1,
					123,
					7,
					true,
				);
				expect(facade.updateJikanEpisodesSyncSynopsisProgress).toHaveBeenNthCalledWith(
					2,
					123,
					7,
					false,
				);
				expect(nextState).toEqual(expect.objectContaining({
					phase:                  "finalize",
					hasNextSynopsisEpisode: false,
				}));
				expect(logMainInfo).toHaveBeenCalledWith(
					"hydrator.jikan-episodes.synopsis-unavailable",
					expect.any(String),
					expect.objectContaining({
						episodeNumber: 7,
						mediaId:       123,
					}),
				);
			},
		);
	},
);
