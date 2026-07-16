// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyPersistedCursorToProgress,
	createAnimeDbScanCheckpoint,
	createIdlePopulateProgress,
	createRunningPopulateProgress,
	OFFICIAL_ANIME_DB_MIN_TOTAL,
	resolvePopulateTotalMediaLowerBound,
	resolveScanAutoRetryDelaySeconds,
} from "./populate-anime-db-policy";

describe(
	"populate-anime-db-policy",
	() => {
		it(
			"keeps the official catalog total as a lower bound until saved rows exceed it",
			() => {
				expect(resolvePopulateTotalMediaLowerBound(
					null,
					0,
				)).toBe(OFFICIAL_ANIME_DB_MIN_TOTAL);
				expect(resolvePopulateTotalMediaLowerBound(
					10,
					OFFICIAL_ANIME_DB_MIN_TOTAL + 1,
				)).toBe(OFFICIAL_ANIME_DB_MIN_TOTAL + 1);
			},
		);

		it(
			"creates running progress from the last committed full-scan cursor",
			() => {
				expect(createRunningPopulateProgress({
					persistedCompletedPage: 4,
					persistedLastMediaId:   450,
					persistedMediaCount:    200,
				})).toEqual(expect.objectContaining({
					currentStatus:           "running",
					currentPage:             5,
					processedMedias:         200,
					totalMedias:             OFFICIAL_ANIME_DB_MIN_TOTAL,
					totalMediasIsLowerBound: true,
					lastProcessedId:         450,
				}));
			},
		);

		it(
			"applies persisted cursor state to idle progress without treating AniList ID pages as totals",
			() => {
				const progress = createIdlePopulateProgress();

				expect(applyPersistedCursorToProgress(
					progress,
					{
						persistedCompletedPage: 428,
						persistedLastMediaId:   21451,
						persistedMediaCount:    9010,
					},
				)).toEqual(expect.objectContaining({
					currentPage:             429,
					processedMedias:         9010,
					totalMedias:             OFFICIAL_ANIME_DB_MIN_TOTAL,
					totalMediasIsLowerBound: true,
					lastProcessedId:         21451,
				}));
			},
		);

		it(
			"builds checkpoint payloads and retry delays from explicit inputs",
			() => {
				expect(createAnimeDbScanCheckpoint(
					{
						persistedCompletedPage: 7,
						persistedLastMediaId:   777,
					},
					123,
				)).toEqual({
					version:              2,
					lastCompletedPage:    7,
					lastPersistedMediaId: 777,
					updatedAt:            123,
				});
				expect(resolveScanAutoRetryDelaySeconds(0)).toBe(5);
			},
		);
	},
);
