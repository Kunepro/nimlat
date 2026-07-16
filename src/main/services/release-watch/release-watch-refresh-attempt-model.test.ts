// @vitest-environment node
import type { UserScheduledMediaRefreshDto } from "@nimlat/types/anime-db";
import {
	describe,
	expect,
	it,
} from "vitest";
import { planScheduledRefreshAttempt } from "./release-watch-refresh-attempt-model";

const now = Date.UTC(
	2026,
	3,
	8,
	12,
);

function createRefresh(overrides: Partial<UserScheduledMediaRefreshDto> = {}): UserScheduledMediaRefreshDto {
	return {
		mediaId:            10,
		releaseWatchReason: "release_window",
		scheduledReleaseAt: now - 1_000,
		nextAttemptAt:      now,
		attemptCount:       0,
		lastOutcome:        "pending",
		updatedAt:          now - 1_000,
		...overrides,
	};
}

describe(
	"planScheduledRefreshAttempt",
	() => {
		it(
			"deletes and rebuilds when catalog facts changed",
			() => {
				expect(planScheduledRefreshAttempt({
					refresh: createRefresh(),
					outcome: "refreshed_changed",
					now,
				})).toEqual({
					type:             "catalog-changed",
					affectedMediaIds: [ 10 ],
					refreshKey:       {
						mediaId:            10,
						releaseWatchReason: "release_window",
						scheduledReleaseAt: now - 1_000,
					},
				});
			},
		);

		it(
			"backs off unchanged refreshes while attempts remain",
			() => {
				expect(planScheduledRefreshAttempt({
					refresh: createRefresh(),
					outcome: "refreshed_no_change",
					now,
				})).toEqual({
					type:             "retry",
					affectedMediaIds: [ 10 ],
					errorMessage:     undefined,
					nextRefresh:      {
						...createRefresh(),
						attemptCount:  1,
						lastAttemptAt: now,
						lastOutcome:   "refreshed_no_change",
						nextAttemptAt: now + 6 * 60 * 60 * 1000,
						cooldownUntil: now + 6 * 60 * 60 * 1000,
						updatedAt:     now,
					},
					pastState:        "released_retry_scheduled",
				});
			},
		);

		it(
			"marks no-change attempts exhausted on the last retry",
			() => {
				const plan = planScheduledRefreshAttempt({
					refresh: createRefresh({ attemptCount: 3 }),
					outcome: "refreshed_no_change",
					now,
				});

				expect(plan).toMatchObject({
					type:        "retry",
					nextRefresh: {
						attemptCount:  4,
						lastOutcome:   "retry_exhausted",
						cooldownUntil: null,
					},
				});
			},
		);

		it(
			"keeps failed as the terminal outcome when failures exhaust retries",
			() => {
				const plan = planScheduledRefreshAttempt({
					refresh:      createRefresh({ attemptCount: 3 }),
					outcome:      "failed",
					now,
					errorMessage: "Provider unavailable",
				});

				expect(plan).toMatchObject({
					type:         "retry",
					errorMessage: "Provider unavailable",
					nextRefresh:  {
						attemptCount:  4,
						lastOutcome:   "failed",
						cooldownUntil: null,
					},
				});
			},
		);
	},
);
