import type { AnimeDbUpdateState } from "@nimlat/types/anime-db-update";
import type { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	applyStoredAnimeDbUpdateStateToIdleProgress,
	createAnimeDbUpdateRunState,
	createCompletedAnimeDbUpdateState,
} from "./anime-db-update-state-store";

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

const idleProgress: AnimeDbUpdateProgressData = {
	status:                          "idle",
	phase:                           "idle",
	currentPage:                     0,
	processedMedias:                 0,
	totalMedias:                     null,
	totalMediasIsLowerBound:         false,
	cutoffProviderUpdatedAt:         null,
	lastSuccessfulProviderUpdatedAt: null,
};

describe(
	"anime-db-update-state-store",
	() => {
		it(
			"creates run state from the active cursor without advancing the successful cursor",
			() => {
				expect(createAnimeDbUpdateRunState({
					cursor:    {
						lastSuccessfulProviderUpdatedAt: 2_000,
						lastKnownTailPage:               12,
						lastSuccessfulRunCompletedAt:    1_000,
					},
					progress:  {
						...idleProgress,
						startedAt: 3_000,
					},
					status:    "running",
					updatedAt: 4_000,
				})).toEqual({
					version:                         1,
					lastSuccessfulProviderUpdatedAt: 2_000,
					lastKnownTailPage:               12,
					lastSuccessfulRunCompletedAt:    1_000,
					lastRunStatus:                   "running",
					startedAt:                       3_000,
					errorMessage:                    null,
					updatedAt:                       4_000,
				});
			},
		);

		it(
			"creates completed state from the final sweep result",
			() => {
				expect(createCompletedAnimeDbUpdateState({
					lastSuccessfulProviderUpdatedAt: 5_000,
					lastKnownTailPage:               24,
					completedAt:                     6_000,
					startedAt:                       3_000,
				})).toEqual({
					version:                         1,
					lastSuccessfulProviderUpdatedAt: 5_000,
					lastKnownTailPage:               24,
					lastSuccessfulRunCompletedAt:    6_000,
					lastRunStatus:                   "completed",
					startedAt:                       3_000,
					errorMessage:                    null,
					updatedAt:                       6_000,
				});
			},
		);

		it(
			"restores an interrupted running update as paused progress",
			() => {
				const state: AnimeDbUpdateState = {
					version:                         1,
					lastSuccessfulProviderUpdatedAt: 4_000,
					lastKnownTailPage:               18,
					lastSuccessfulRunCompletedAt:    2_000,
					lastRunStatus:                   "running",
					startedAt:                       1_500,
					errorMessage:                    "interrupted",
					updatedAt:                       1_750,
				};

				expect(applyStoredAnimeDbUpdateStateToIdleProgress(
					idleProgress,
					state,
				)).toEqual(expect.objectContaining({
					status:                          "paused",
					phase:                           "idle",
					lastSuccessfulProviderUpdatedAt: 4_000,
					lastSuccessfulRunCompletedAt:    2_000,
					startedAt:                       1_500,
					completedAt:                     2_000,
					errorMessage:                    "interrupted",
				}));
			},
		);
	},
);
