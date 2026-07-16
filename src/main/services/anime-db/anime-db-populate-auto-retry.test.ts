import {
	describe,
	expect,
	it,
} from "vitest";
import { createAnimeDbPopulateAutoRetryPlan } from "./anime-db-populate-auto-retry";

describe(
	"createAnimeDbPopulateAutoRetryPlan",
	() => {
		it(
			"creates the next retry progress patch and log context",
			() => {
				const error = new Error("network down");

				expect(createAnimeDbPopulateAutoRetryPlan({
					currentAttempt: 0,
					error,
					cursor:         {
						persistedCompletedPage: 4,
						persistedLastMediaId:   450,
						persistedMediaCount:    123,
					},
					now:            10_000,
				})).toEqual({
					attempt:           1,
					retryDelaySeconds: 5,
					progressPatch:     {
						currentStatus:        "retrying",
						errorMessage:         "network down",
						autoRetryAttempt:     1,
						autoRetryMaxAttempts: 6,
						nextRetryAt:          15_000,
						currentPage:          5,
						lastProcessedId:      450,
					},
					logContext:        {
						attempt:                1,
						maxAttempts:            6,
						retryDelaySeconds:      5,
						persistedCompletedPage: 4,
						nextPage:               5,
						persistedLastMediaId:   450,
						persistedMediaCount:    123,
					},
				});
			},
		);

		it(
			"returns null after the maximum retry count",
			() => {
				expect(createAnimeDbPopulateAutoRetryPlan({
					currentAttempt: 6,
					error:          new Error("still down"),
					cursor:         {
						persistedCompletedPage: 0,
						persistedLastMediaId:   0,
						persistedMediaCount:    0,
					},
					now:            10_000,
				})).toBeNull();
			},
		);
	},
);
