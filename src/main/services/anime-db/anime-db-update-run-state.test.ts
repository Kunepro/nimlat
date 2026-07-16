import type { AnimeDbUpdateState } from "@nimlat/types/anime-db-update";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	AnimeDbUpdateRunState,
	createIdleAnimeDbUpdateProgress,
} from "./anime-db-update-run-state";

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			scanState: {
				loadAnimeDbUpdateState: vi.fn(),
				saveAnimeDbUpdateState: vi.fn(),
			},
		},
	}),
);

describe(
	"AnimeDbUpdateRunState",
	() => {
		it(
			"starts a running update from the durable cursor",
			() => {
				const state = new AnimeDbUpdateRunState();

				state.markRunning(
					{
						lastSuccessfulProviderUpdatedAt: 2_000_000,
						lastKnownTailPage:               20,
						lastSuccessfulRunCompletedAt:    100_000,
					},
					200_000,
				);

				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:                          "running",
					phase:                           "updated-at-sweep",
					currentPage:                     1,
					processedMedias:                 0,
					cutoffProviderUpdatedAt:         1_395_200,
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastSuccessfulRunCompletedAt:    100_000,
					startedAt:                       200_000,
				}));
			},
		);

		it(
			"tracks sweep/page progress without losing cursor metadata",
			() => {
				const state = new AnimeDbUpdateRunState();
				state.markRunning(
					{
						lastSuccessfulProviderUpdatedAt: 2_000_000,
						lastKnownTailPage:               20,
						lastSuccessfulRunCompletedAt:    100_000,
					},
					200_000,
				);

				state.markUpdatedAtSweepStarted(
					2,
					1_500_000,
				);
				state.markPageProgress(
					2,
					{
						total:       321,
						perPage:     50,
						currentPage: 2,
						lastPage:    7,
						hasNextPage: true,
					},
				);
				state.markTailSweepStarted(18);

				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:                          "running",
					phase:                           "tail-sweep",
					currentPage:                     18,
					totalMedias:                     null,
					totalMediasIsLowerBound:         true,
					cutoffProviderUpdatedAt:         1_500_000,
					lastSuccessfulProviderUpdatedAt: 2_000_000,
				}));
			},
		);

		it(
			"reports when media ingestion should rebroadcast progress",
			() => {
				const state = new AnimeDbUpdateRunState();
				state.markRunning(
					{
						lastSuccessfulProviderUpdatedAt: 1,
						lastKnownTailPage:               1,
						lastSuccessfulRunCompletedAt:    null,
					},
					10,
				);

				const shouldBroadcast = Array.from(
					{ length: 5 },
					(_, index) => state.recordMediaIngested({
						mediaId:           100 + index,
						providerUpdatedAt: 2_000 + index,
					}),
				);

				expect(shouldBroadcast).toEqual([
					false,
					false,
					false,
					false,
					true,
				]);
				expect(state.getProgress()).toEqual(expect.objectContaining({
					processedMedias:                5,
					lastProcessedId:                104,
					lastProcessedProviderUpdatedAt: 2_004,
				}));
			},
		);

		it(
			"restores durable terminal states and marks new terminal statuses",
			() => {
				const storedState: AnimeDbUpdateState = {
					version:                         1,
					lastSuccessfulProviderUpdatedAt: 5_000,
					lastKnownTailPage:               24,
					lastSuccessfulRunCompletedAt:    6_000,
					lastRunStatus:                   "running",
					startedAt:                       3_000,
					errorMessage:                    "interrupted",
					updatedAt:                       4_000,
				};
				const state                           = new AnimeDbUpdateRunState();

				state.restoreIdleFromState(storedState);
				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:                          "paused",
					phase:                           "idle",
					lastSuccessfulProviderUpdatedAt: 5_000,
					startedAt:                       3_000,
					errorMessage:                    "interrupted",
				}));

				state.markPaused();
				expect(state.getProgress()).toEqual(expect.objectContaining({
					status: "paused",
				}));

				state.markCompleted({
					completedAt:                     10_000,
					lastSuccessfulProviderUpdatedAt: 7_500,
				});
				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:                          "completed",
					phase:                           "completed",
					completedAt:                     10_000,
					lastSuccessfulRunCompletedAt:    10_000,
					cooldownEndsAt:                  86_410_000,
					lastSuccessfulProviderUpdatedAt: 7_500,
				}));

				state.markError("write failed");
				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:       "error",
					errorMessage: "write failed",
				}));
			},
		);

		it(
			"creates a clean idle snapshot",
			() => {
				expect(createIdleAnimeDbUpdateProgress()).toEqual({
					status:                          "idle",
					phase:                           "idle",
					currentPage:                     0,
					processedMedias:                 0,
					totalMedias:                     null,
					totalMediasIsLowerBound:         false,
					cutoffProviderUpdatedAt:         null,
					lastSuccessfulProviderUpdatedAt: null,
				});
			},
		);
	},
);
