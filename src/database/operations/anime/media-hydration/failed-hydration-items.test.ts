// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { isTerminalJikanFailureForTest } from "./failed-hydration-items-model";
import { getFailedItemsSourceSelectForTest } from "./failed-hydration-source-select";

describe(
	"failed hydration item SQL",
	() => {
		it(
			"keeps every active Errored Content queue branch joined by UNION ALL",
			() => {
				const sourceSelect = getFailedItemsSourceSelectForTest();

				expect(sourceSelect).toContain("SELECT 'characters' AS queue");
				expect(sourceSelect).toContain("UNION ALL\n                         SELECT 'staff' AS queue");
				expect(sourceSelect).toContain("UNION ALL\n                         SELECT 'jikan-episodes' AS queue");
				expect(sourceSelect).toContain("UNION ALL\n                         SELECT 'jikan-episode-thumbnails'");
				expect(sourceSelect).not.toMatch(/INTEGER\)\s*SELECT 'characters'/);
			},
		);

		it(
			"treats terminal thumbnail failures as non-retryable",
			() => {
				expect(isTerminalJikanFailureForTest(
					"jikan-episode-thumbnails",
					"episode_video_thumbnails_unavailable",
				)).toBe(true);
				expect(isTerminalJikanFailureForTest(
					"jikan-episode-thumbnails",
					"transient_failure",
				)).toBe(false);
				expect(isTerminalJikanFailureForTest(
					"characters",
					"missing_mal_id",
				)).toBe(false);
			},
		);
	},
);
