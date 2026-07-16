// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	type FailedHydrationItemRow,
	getMediaFingerprintIdentity,
	isTerminalFailedHydrationItem,
	normalizeFingerprintSegment,
	toErroredContentItem,
} from "./failed-hydration-items-model";

function createFailedHydrationRow(overrides: Partial<FailedHydrationItemRow> = {}): FailedHydrationItemRow {
	return {
		queue:              "characters",
		mediaId:            10,
		name:               "Example Media",
		format:             "TV",
		status:             "FINISHED",
		idAniList:          100,
		idMal:              200,
		errorMessage:       "Transient failure 123",
		failureReason:      "transient_failure",
		queueStatus:        "failed",
		retryCount:         1,
		lastTriedAt:        1000,
		nextAutoRetryAt:    null,
		lastSuccessfulPage: null,
		resumeFromPage:     null,
		isHidden:           0,
		hiddenAt:           null,
		canOpenMedia:       1,
		...overrides,
	};
}

describe(
	"failed hydration items model",
	() => {
		it(
			"normalizes fingerprint segments without leaking volatile numbers",
			() => {
				expect(normalizeFingerprintSegment(" Failed 123 \n at page 45 ")).toBe("failed # at page #");
				expect(normalizeFingerprintSegment(null)).toBe("unknown");
			},
		);

		it(
			"uses provider ids before local media ids for fingerprint identity",
			() => {
				expect(getMediaFingerprintIdentity(createFailedHydrationRow())).toBe("anilist:100");
				expect(getMediaFingerprintIdentity(createFailedHydrationRow({
					idAniList: null,
				}))).toBe("mal:200");
				expect(getMediaFingerprintIdentity(createFailedHydrationRow({
					idAniList: null,
					idMal:     null,
				}))).toBe("media:10");
			},
		);

		it(
			"marks terminal Jikan failures as report-only and non-retryable",
			() => {
				const terminalRow = createFailedHydrationRow({
					queue:         "jikan-episodes",
					failureReason: "missing_mal_id",
				});

				expect(isTerminalFailedHydrationItem(terminalRow)).toBe(true);
				expect(toErroredContentItem(terminalRow)).toMatchObject({
					canRetry:          false,
					recommendedAction: "report",
				});
			},
		);

		it(
			"maps pending retries, exhausted retries, booleans, and stable fingerprints",
			() => {
				const plannedRetry = toErroredContentItem(createFailedHydrationRow({
					queueStatus: "pending",
					retryCount:  2,
					isHidden:    1,
				}));
				expect(plannedRetry).toMatchObject({
					canOpenMedia:       true,
					isHidden:           true,
					canRetry:           true,
					isAutoRetryPlanned: true,
					isRetryExhausted:   false,
					recommendedAction:  "retry",
				});
				expect(plannedRetry.fingerprint).toMatch(/^NIMLAT-ERR-[0-9A-F]{12}$/);
				expect(plannedRetry.fingerprint).toBe(toErroredContentItem(createFailedHydrationRow({
					queueStatus:  "pending",
					retryCount:   2,
					isHidden:     1,
					errorMessage: "Transient failure 999",
				})).fingerprint);

				expect(toErroredContentItem(createFailedHydrationRow({
					retryCount: 5,
				}))).toMatchObject({
					isRetryExhausted:  true,
					recommendedAction: "report",
				});
			},
		);
	},
);
