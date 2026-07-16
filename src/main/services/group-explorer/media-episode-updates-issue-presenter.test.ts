import type { MediaEpisodeUpdatesIssue } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import { buildMediaEpisodeUpdatesIssue } from "./media-episode-updates-issue-presenter";

describe(
	"buildMediaEpisodeUpdatesIssue",
	() => {
		it(
			"reports missing MAL ids as unsupported without requiring queue failure state",
			() => {
				expect(buildMediaEpisodeUpdatesIssue({
					mediaId:     12,
					hasMalId:    false,
					queueStatus: null,
					failedIssue: null,
					isOnline:    true,
				})).toEqual({
					mediaId:    12,
					status:     "unsupported",
					reason:     "missing_mal_id",
					retryCount: 0,
				});
			},
		);

		it(
			"lets offline state override transient retryable failures",
			() => {
				const failedIssue: MediaEpisodeUpdatesIssue = {
					mediaId:      99,
					status:       "failed",
					reason:       "transient_failure",
					errorMessage: "fetch failed",
					retryCount:   2,
					lastTriedAt:  123,
				};

				expect(buildMediaEpisodeUpdatesIssue({
					mediaId:     99,
					hasMalId:    true,
					queueStatus: "failed",
					failedIssue,
					isOnline:    false,
				})).toEqual({
					mediaId:      99,
					status:       "failed",
					reason:       "network_unavailable",
					errorMessage: "fetch failed",
					retryCount:   2,
					lastTriedAt:  123,
				});
			},
		);

		it(
			"keeps explicit Jikan resource failures unsupported instead of retryable",
			() => {
				expect(buildMediaEpisodeUpdatesIssue({
					mediaId:     44,
					hasMalId:    true,
					queueStatus: "failed",
					failedIssue: {
						mediaId:    44,
						status:     "failed",
						reason:     "jikan_resource_unavailable",
						retryCount: 1,
					},
					isOnline:    true,
				})).toEqual({
					mediaId:    44,
					status:     "unsupported",
					reason:     "jikan_resource_unavailable",
					retryCount: 1,
				});
			},
		);

		it(
			"returns null when the media has provider support and no queued issue",
			() => {
				expect(buildMediaEpisodeUpdatesIssue({
					mediaId:     77,
					hasMalId:    true,
					queueStatus: null,
					failedIssue: null,
					isOnline:    true,
				})).toBeNull();
			},
		);
	},
);
