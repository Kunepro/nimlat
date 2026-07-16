// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const pastListChangedNext          = vi.fn();
const upcomingListChangedNext      = vi.fn();
const getTrackedMediaIds           = vi.fn();
const getAllTrackedMediaIds        = vi.fn();
const getIgnoredMediaIds           = vi.fn();
const relationsAll                 = vi.fn();
const relationsAllByMediaIds = vi.fn();
const getMediaFacts                = vi.fn();
const saveState                    = vi.fn();
const deleteState                  = vi.fn();
const saveScheduledRefresh         = vi.fn();
const deleteScheduledRefresh       = vi.fn();
const deleteScheduledRefreshesByMediaId = vi.fn();
const listInterestMediaIds         = vi.fn();
const replaceInterestMedia         = vi.fn();
const logMainServiceError          = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_ReleaseWatchPastListChanged: {
			next: pastListChangedNext,
		},
		BUS_ReleaseWatchUpcomingListChanged: {
			next: upcomingListChangedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			media: {
				relations: {
					all: relationsAll,
					allByMediaIds: relationsAllByMediaIds,
				},
			},
		},
		UserDbFacade:  {
			integration: {
				getTrackedMediaIds,
				getAllTrackedMediaIds,
				getIgnoredMediaIds,
			},
			releaseWatch: {
				getMediaFacts,
				saveState,
				deleteState,
				saveScheduledRefresh,
				deleteScheduledRefresh,
				deleteScheduledRefreshesByMediaId,
				listInterestMediaIds,
				replaceInterestMedia,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError,
		},
	}),
);

describe(
	"ReleaseWatchCoordinator",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
			getAllTrackedMediaIds.mockReturnValue([]);
			getIgnoredMediaIds.mockReturnValue([]);
			relationsAll.mockReturnValue([]);
			relationsAllByMediaIds.mockReturnValue([]);
			listInterestMediaIds.mockReturnValue([]);
		});

		it(
			"normalizes non-Error catalog mutation failures before logging",
			async () => {
				const nonErrorFailure: unknown = { message: "catalog mutation failed" };
				deleteScheduledRefreshesByMediaId.mockImplementationOnce(() => {
					throw nonErrorFailure;
				});

				const { ReleaseWatchCoordinator } = await import("./release-watch-coordinator");
				ReleaseWatchCoordinator.tryHandleCatalogMediaMutation({
					affectedMediaIds: [ 10 ],
					context:          "media-refresh",
				});

				expect(logMainServiceError).toHaveBeenCalledWith(
					"release-watch.handle-catalog-media-mutation",
					expect.any(Error),
					expect.objectContaining({
						context:          "media-refresh",
						affectedMediaIds: [ 10 ],
					}),
				);
				expect(logMainServiceError).toHaveBeenCalledWith(
					"release-watch.handle-catalog-media-mutation",
					expect.objectContaining({ message: "catalog mutation failed" }),
					expect.any(Object),
				);
			},
		);

		it(
			"normalizes non-Error integration cascade failures before logging",
			async () => {
				const nonErrorFailure: unknown = "interest scope failed";
				listInterestMediaIds.mockImplementationOnce(() => {
					throw nonErrorFailure;
				});

				const { ReleaseWatchCoordinator } = await import("./release-watch-coordinator");
				ReleaseWatchCoordinator.tryHandleIntegrationCascade(
					[ 20 ],
					"media-status-change",
				);

				expect(logMainServiceError).toHaveBeenCalledWith(
					"release-watch.handle-integration-cascade",
					expect.any(Error),
					expect.objectContaining({
						context:          "media-status-change",
						affectedMediaIds: [ 20 ],
					}),
				);
				expect(logMainServiceError).toHaveBeenCalledWith(
					"release-watch.handle-integration-cascade",
					expect.objectContaining({ message: "interest scope failed" }),
					expect.any(Object),
				);
			},
		);

		it(
			"schedules future followed media after catalog mutation and clears obsolete scheduled rows",
			async () => {
				const releaseAt = Date.now() + 86_400_000;
				getAllTrackedMediaIds.mockReturnValue([ 10 ]);
				getMediaFacts.mockReturnValue([
					{
						mediaId:            10,
						name:               "Future Show",
						format:             "TV",
						status:             "RELEASING",
						nextAiringEpisodeJson: JSON.stringify({ airingAt: releaseAt / 1000 }),
						integrationStatus:  "tracked",
						integrationPercent: 0,
						lastRefreshAt:      Date.now() - 1_000,
					},
				]);

				const { ReleaseWatchCoordinator } = await import("./release-watch-coordinator");
				ReleaseWatchCoordinator.tryHandleCatalogMediaMutation({
					affectedMediaIds: [ 10 ],
					context: "media-refresh",
				});

				expect(deleteScheduledRefreshesByMediaId).toHaveBeenCalledWith(10);
				expect(replaceInterestMedia).toHaveBeenCalledWith([
					expect.objectContaining({
						mediaId:       10,
						sourceMediaId: 10,
						reason:        "tracked",
					}),
				]);
				expect(saveState).toHaveBeenCalledWith(expect.objectContaining({
					mediaId:     10,
					watchDomain: "upcoming",
					state:       "upcoming_episode_release",
					resolvedReleaseAt: releaseAt,
				}));
				expect(saveScheduledRefresh).toHaveBeenCalledWith(expect.objectContaining({
					mediaId:       10,
					releaseWatchReason: "release_window",
					scheduledReleaseAt: releaseAt,
					nextAttemptAt: releaseAt + 7_200_000,
				}));
				expect(upcomingListChangedNext).toHaveBeenCalledWith({ affectedMediaIds: [ 10 ] });
			},
		);

		it(
			"immediately rebuilds release-watch scope from tracked media and non-ignored related media",
			async () => {
				const onePieceNextEpisodeAt = Date.now() + 7 * 86_400_000;
				const filmReleaseAt         = Date.UTC(
					2026,
					6,
					1,
				);
				listInterestMediaIds.mockReturnValue([ 88 ]);
				getAllTrackedMediaIds.mockReturnValue([ 21 ]);
				relationsAllByMediaIds.mockReturnValue([
					{
						mediaId: 21,
						relatedMediaId: 1000,
						relationType:   "SIDE_STORY",
					},
					{
						mediaId: 21,
						relatedMediaId: 1001,
						relationType:   "MOVIE",
					},
				]);
				getIgnoredMediaIds.mockReturnValue([ 1001 ]);
				getMediaFacts.mockReturnValue([
					{
						mediaId:               21,
						name:                  "ONE PIECE",
						format:                "TV",
						status:                "RELEASING",
						nextAiringEpisodeJson: JSON.stringify({ airingAt: onePieceNextEpisodeAt / 1000 }),
						integrationStatus:     "tracked",
					},
					{
						mediaId:           1000,
						name:              "One Piece Film",
						format:            "MOVIE",
						status:            "NOT_YET_RELEASED",
						startDateYear:     2026,
						startDateMonth:    7,
						startDateDay:      1,
						integrationStatus: null,
					},
				]);

				const { ReleaseWatchCoordinator } = await import("./release-watch-coordinator");
				ReleaseWatchCoordinator.tryHandleIntegrationCascade(
					[ 21 ],
					"media-status-change",
				);

				expect(relationsAllByMediaIds).toHaveBeenCalledWith([ 21 ]);
				expect(relationsAll).not.toHaveBeenCalled();
				expect(replaceInterestMedia).toHaveBeenCalledWith(expect.arrayContaining([
					expect.objectContaining({
						mediaId:       21,
						sourceMediaId: 21,
						reason:        "tracked",
					}),
					expect.objectContaining({
						mediaId:       1000,
						sourceMediaId: 21,
						reason:        "related",
					}),
				]));
				expect(replaceInterestMedia).not.toHaveBeenCalledWith(expect.arrayContaining([
					expect.objectContaining({ mediaId: 1001 }),
				]));
				expect(deleteState).toHaveBeenCalledWith(
					88,
					"past",
				);
				expect(deleteState).toHaveBeenCalledWith(
					88,
					"upcoming",
				);
				expect(deleteScheduledRefreshesByMediaId).toHaveBeenCalledWith(88);
				expect(saveState).toHaveBeenCalledWith(expect.objectContaining({
					mediaId:           21,
					watchDomain:       "upcoming",
					state:             "upcoming_episode_release",
					resolvedReleaseAt: onePieceNextEpisodeAt,
				}));
				expect(saveState).toHaveBeenCalledWith(expect.objectContaining({
					mediaId:           1000,
					watchDomain:       "upcoming",
					state:             "upcoming_media_release",
					resolvedReleaseAt: filmReleaseAt,
				}));
				expect(upcomingListChangedNext).toHaveBeenCalledWith({
					affectedMediaIds: expect.arrayContaining([
						21,
						88,
						1000,
					]),
				});
			},
		);

		it(
			"backs off scheduled refreshes that did not change catalog facts",
			async () => {
				const { ReleaseWatchCoordinator } = await import("./release-watch-coordinator");
				const now = Date.now();

				ReleaseWatchCoordinator.handleScheduledRefreshAttempt({
					refresh: {
						mediaId:       10,
						releaseWatchReason: "release_window",
						scheduledReleaseAt: now - 1_000,
						nextAttemptAt: now,
						attemptCount:  0,
						lastOutcome:   "pending",
						updatedAt:     now - 1_000,
					},
					outcome: "refreshed_no_change",
				});

				expect(saveScheduledRefresh).toHaveBeenCalledWith(expect.objectContaining({
					mediaId:      10,
					attemptCount: 1,
					lastOutcome:  "refreshed_no_change",
					nextAttemptAt: now + 6 * 60 * 60 * 1000,
					cooldownUntil: now + 6 * 60 * 60 * 1000,
				}));
				expect(saveState).toHaveBeenCalledWith(expect.objectContaining({
					mediaId: 10,
					watchDomain: "past",
					state:   "released_retry_scheduled",
				}));
				expect(deleteState).toHaveBeenCalledWith(
					10,
					"upcoming",
				);
				expect(pastListChangedNext).toHaveBeenCalledWith({ affectedMediaIds: [ 10 ] });
				expect(upcomingListChangedNext).toHaveBeenCalledWith({ affectedMediaIds: [ 10 ] });
			},
		);
	},
);
