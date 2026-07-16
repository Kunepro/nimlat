// @vitest-environment node
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	AnimeDbFacade: {
		media: {
			getProviderIds: vi.fn(),
		},
	},
	getAniListMediaProvider:       vi.fn(),
	getMediaById:                  vi.fn(),
	handleScheduledRefreshAttempt: vi.fn(),
	ingestAnimeDbMedia:            vi.fn(),
	logMainServiceError:           vi.fn(),
	UserDbFacade:  {
		releaseWatch: {
			getMediaFacts:             vi.fn(),
			listDueScheduledRefreshes: vi.fn(),
		},
	},
}));

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: mocks.AnimeDbFacade,
		UserDbFacade:  mocks.UserDbFacade,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: mocks.logMainServiceError,
		},
	}),
);

vi.mock(
	"../providers/media-provider-registry",
	() => ({
		MediaProviderRegistry: {
			getAniListMediaProvider: mocks.getAniListMediaProvider,
		},
	}),
);

vi.mock(
	"../services/anime-db/anime-db-media-ingestion",
	() => ({ ingestAnimeDbMedia: mocks.ingestAnimeDbMedia }),
);

vi.mock(
	"../services/release-watch/release-watch-coordinator",
	() => ({
		ReleaseWatchCoordinator: {
			handleScheduledRefreshAttempt: mocks.handleScheduledRefreshAttempt,
		},
	}),
);

describe(
	"ReleaseWatchDaemon",
	() => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.clearAllMocks();
			mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes.mockReturnValue([]);
			mocks.AnimeDbFacade.media.getProviderIds.mockReturnValue({ idAniList: 100 });
			mocks.UserDbFacade.releaseWatch.getMediaFacts.mockReturnValue([]);
			mocks.getAniListMediaProvider.mockReturnValue({ getMediaById: mocks.getMediaById });
			mocks.getMediaById.mockResolvedValue({ id: 100 });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it(
			"clears its sweep timer on dispose",
			async () => {
				const { ReleaseWatchDaemon } = await import("./release-watch-daemon");
				const daemon                 = new ReleaseWatchDaemon();

				expect(mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes).toHaveBeenCalledTimes(1);
				await Promise.resolve();

				vi.advanceTimersByTime(60_000);
				expect(mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes).toHaveBeenCalledTimes(2);

				daemon.dispose();
				vi.advanceTimersByTime(60_000);

				expect(mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes).toHaveBeenCalledTimes(2);
			},
		);

		it(
			"drops overlapping sweeps while a refresh batch is still running",
			async () => {
				let resolveProviderFetch: (value: unknown) => void = () => undefined;
				const providerFetch                                = new Promise((resolve) => {
					resolveProviderFetch = resolve;
				});
				mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes.mockReturnValue([
					{
						mediaId:            10,
						releaseWatchReason: "release_window",
						scheduledReleaseAt: Date.now() - 1_000,
						nextAttemptAt:      Date.now(),
						attemptCount:       0,
						lastOutcome:        "pending",
						updatedAt:          Date.now(),
					},
				]);
				mocks.UserDbFacade.releaseWatch.getMediaFacts.mockReturnValue([
					{
						mediaId: 10,
						name:    "Future Show",
					},
				]);
				mocks.getMediaById.mockReturnValue(providerFetch);

				const { ReleaseWatchDaemon } = await import("./release-watch-daemon");
				const daemon                 = new ReleaseWatchDaemon();

				expect(mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes).toHaveBeenCalledTimes(1);

				vi.advanceTimersByTime(60_000);

				expect(mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes).toHaveBeenCalledTimes(1);

				resolveProviderFetch({ id: 100 });
				await Promise.resolve();
				await Promise.resolve();
				await Promise.resolve();

				vi.advanceTimersByTime(60_000);

				expect(mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes).toHaveBeenCalledTimes(2);

				daemon.dispose();
			},
		);

		it(
			"logs loop errors without killing later sweeps",
			async () => {
				mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes
					.mockImplementationOnce(() => {
						throw "DB temporarily unavailable";
					})
					.mockReturnValue([]);

				const { ReleaseWatchDaemon } = await import("./release-watch-daemon");
				const daemon                 = new ReleaseWatchDaemon();

				await Promise.resolve();

				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"release-watch-daemon.loop",
					expect.any(Error),
				);
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"release-watch-daemon.loop",
					expect.objectContaining({ message: "DB temporarily unavailable" }),
				);

				vi.advanceTimersByTime(60_000);
				await Promise.resolve();

				expect(mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes).toHaveBeenCalledTimes(2);

				daemon.dispose();
			},
		);

		it(
			"normalizes refresh failures before recording retry state",
			async () => {
				const refresh = {
					mediaId:            10,
					releaseWatchReason: "release_window",
					scheduledReleaseAt: Date.now() - 1_000,
					nextAttemptAt:      Date.now(),
					attemptCount:       0,
					lastOutcome:        "pending",
					updatedAt:          Date.now() - 1_000,
				};

				mocks.UserDbFacade.releaseWatch.listDueScheduledRefreshes.mockReturnValueOnce([ refresh ]);
				mocks.UserDbFacade.releaseWatch.getMediaFacts.mockReturnValue([
					{
						mediaId: 10,
						name:    "Future Show",
					},
				]);
				mocks.getMediaById.mockRejectedValueOnce("provider string failure");

				const { ReleaseWatchDaemon } = await import("./release-watch-daemon");
				const daemon                 = new ReleaseWatchDaemon();

				await Promise.resolve();
				await Promise.resolve();
				await Promise.resolve();
				await Promise.resolve();

				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"release-watch-daemon.process-refresh",
					expect.any(Error),
					expect.objectContaining({ mediaId: 10 }),
				);
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"release-watch-daemon.process-refresh",
					expect.objectContaining({ message: "provider string failure" }),
					expect.objectContaining({ mediaId: 10 }),
				);
				expect(mocks.handleScheduledRefreshAttempt).toHaveBeenCalledWith(expect.objectContaining({
					outcome:      "failed",
					errorMessage: "provider string failure",
				}));

				daemon.dispose();
			},
		);
	},
);
