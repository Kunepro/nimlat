// @vitest-environment node
import type {
	AnimeDbUpdateBaseline,
	AnimeDbUpdateState,
} from "@nimlat/types/anime-db-update";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	ANILIST_PAGE_SIZE,
	createRunningUpdateProgress,
	resolveAnimeDbUpdateStartCursor,
	resolveCooldownEndsAt,
	resolveUpdatedAtSweepCutoff,
	UPDATE_COOLDOWN_MS,
} from "./anime-db-update-policy";

const baseline: AnimeDbUpdateBaseline = {
	mediaCount:           1000,
	maxProviderUpdatedAt: 2_000_000,
};

const completedState: AnimeDbUpdateState = {
	version:                         1,
	lastSuccessfulProviderUpdatedAt: 3_000_000,
	lastKnownTailPage:               42,
	lastSuccessfulRunCompletedAt:    100_000,
	lastRunStatus:                   "completed",
	startedAt:                       90_000,
	errorMessage:                    null,
	updatedAt:                       100_000,
};

describe(
	"anime-db-update-policy",
	() => {
		it(
			"prefers persisted updater state over the baseline estimate",
			() => {
				expect(resolveAnimeDbUpdateStartCursor({
					baseline,
					persistedState: completedState,
				})).toEqual({
					lastSuccessfulProviderUpdatedAt: 3_000_000,
					lastKnownTailPage:               42,
					lastSuccessfulRunCompletedAt:    100_000,
				});
			},
		);

		it(
			"derives the first incremental tail page from the actual catalog size",
			() => {
				expect(resolveAnimeDbUpdateStartCursor({
					baseline,
					persistedState: null,
				}).lastKnownTailPage).toBe(20);

				expect(resolveAnimeDbUpdateStartCursor({
					baseline:       {
						mediaCount:           ANILIST_PAGE_SIZE * 3 + 1,
						maxProviderUpdatedAt: null,
					},
					persistedState: null,
				})).toEqual({
					lastSuccessfulProviderUpdatedAt: 0,
					lastKnownTailPage:               4,
					lastSuccessfulRunCompletedAt:    null,
				});
			},
		);

		it(
			"builds running progress with an updatedAt overlap cutoff",
			() => {
				const cursor = {
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage:               20,
					lastSuccessfulRunCompletedAt:    null,
				};

				expect(resolveUpdatedAtSweepCutoff(cursor)).toBe(1_395_200);
				expect(createRunningUpdateProgress(
					cursor,
					123_456,
				)).toEqual(expect.objectContaining({
					status:                          "running",
					phase:                           "updated-at-sweep",
					cutoffProviderUpdatedAt:         1_395_200,
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					startedAt:                       123_456,
				}));
			},
		);

		it(
			"only applies update cooldown to completed runs",
			() => {
				expect(resolveCooldownEndsAt(completedState)).toBe(100_000 + UPDATE_COOLDOWN_MS);
				expect(resolveCooldownEndsAt({
					...completedState,
					lastRunStatus: "error",
				})).toBeNull();
			},
		);
	},
);
