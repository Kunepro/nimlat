import {
	describe,
	expect,
	it,
} from "vitest";
import {
	buildEpisodeUpdatesActivePresentation,
	buildEpisodeUpdatesIssuePresentation,
	createRetryFailedIssue,
	createRetryPendingIssue,
	toEpisodeUpdatesRetryErrorMessage,
} from "./episode-updates-status-model";

describe(
	"episode-updates-status-model",
	() => {
		it(
			"maps structured issue reasons to user-facing presentations",
			() => {
				expect(buildEpisodeUpdatesIssuePresentation({
					mediaId:    1,
					reason:     "missing_mal_id",
					retryCount: 0,
					status:     "unsupported",
				})).toEqual({
					type:        "warning",
					message:     "Episode updates are unavailable for this media",
					description: "This media has no episode mapping, so episode metadata cannot be loaded.",
					canRetry:    false,
				});
				expect(buildEpisodeUpdatesIssuePresentation({
					mediaId:    1,
					reason:     "network_unavailable",
					retryCount: 1,
					status:     "failed",
				})).toEqual({
					type:        "warning",
					message:     "Episode updates could not continue while offline",
					description: "Reconnect to the internet and retry if the updates do not resume automatically.",
					canRetry:    true,
				});
				expect(buildEpisodeUpdatesIssuePresentation({
					mediaId:    1,
					reason:     "jikan_resource_unavailable",
					retryCount: 1,
					status:     "unsupported",
				})).toEqual({
					type:        "warning",
					message:     "Episode intel unavailable",
					description: "Retry scan to check whether episode details can be loaded now.",
					canRetry:    true,
				});
				expect(buildEpisodeUpdatesIssuePresentation({
					errorMessage: "provider failed",
					mediaId:      1,
					reason:       "transient_failure",
					retryCount:   2,
					status:       "failed",
				})).toEqual({
					type:        "error",
					message:     "Episode updates failed",
					description: "provider failed",
					canRetry:    true,
				});
			},
		);

		it(
			"uses distinct active copy for first-load alerts and inline refresh controls",
			() => {
				expect(buildEpisodeUpdatesActivePresentation(
					"pending",
					"empty-state",
				)).toEqual({
					buttonLabel: "Refresh queued",
					message:     "Episode metadata is queued for loading.",
				});
				expect(buildEpisodeUpdatesActivePresentation(
					"pending",
					"inline-action",
				)).toEqual({
					buttonLabel: "Refresh queued",
					message:     "Episode reload is queued and will update this list when it finishes.",
				});
				expect(buildEpisodeUpdatesActivePresentation(
					"processing",
					"inline-action",
				)).toEqual({
					buttonLabel: "Reloading episodes",
					message:     "Episode reload is already running in the background.",
				});
			},
		);

		it(
			"creates retry lifecycle issues without leaking transport details",
			() => {
				expect(createRetryPendingIssue(7)).toEqual({
					mediaId:    7,
					status:     "pending",
					retryCount: 0,
				});
				expect(createRetryFailedIssue(
					7,
					"retry failed",
					3,
				)).toEqual({
					mediaId:      7,
					status:       "failed",
					errorMessage: "retry failed",
					retryCount:   3,
				});
				expect(toEpisodeUpdatesRetryErrorMessage(new Error("ipc failed"))).toBe("ipc failed");
				expect(toEpisodeUpdatesRetryErrorMessage("unknown")).toBe("Episode updates could not be queued.");
			},
		);
	},
);
