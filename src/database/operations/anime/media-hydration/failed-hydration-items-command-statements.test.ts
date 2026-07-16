// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	STMT_HIDE_JIKAN_EPISODES,
	STMT_RETRY_ALL_JIKAN_EPISODES,
	STMT_RETRY_JIKAN_EPISODES,
	STMT_SELECT_RETRYABLE_JIKAN_EPISODE_MEDIA_IDS,
	STMT_UPSERT_JIKAN_EPISODES_PRIORITY,
} from "./failed-hydration-items-command-statements";

describe(
	"failed hydration item command SQL",
	() => {
		it(
			"keeps terminal Jikan failures out of manual retry paths",
			() => {
				[
					STMT_RETRY_JIKAN_EPISODES,
					STMT_RETRY_ALL_JIKAN_EPISODES,
					STMT_SELECT_RETRYABLE_JIKAN_EPISODE_MEDIA_IDS,
				].forEach((statement) => {
					expect(statement).toContain("failureReason NOT IN");
					expect(statement).toContain("'missing_mal_id'");
					expect(statement).toContain("'jikan_resource_unavailable'");
					expect(statement).toContain("'episode_video_thumbnails_unavailable'");
				});
			},
		);

		it(
			"keeps Jikan episode retry priority separate from hide visibility",
			() => {
				expect(STMT_UPSERT_JIKAN_EPISODES_PRIORITY).toContain("mediaHydrationQueueJikanEpisodesPriority");
				expect(STMT_RETRY_JIKAN_EPISODES).not.toContain("mediaHydrationQueueJikanEpisodesPriority");
				expect(STMT_HIDE_JIKAN_EPISODES).not.toContain("failureReason NOT IN");
			},
		);
	},
);
