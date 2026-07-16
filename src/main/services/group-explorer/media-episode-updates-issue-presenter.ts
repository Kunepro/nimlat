import type { MediaEpisodeUpdatesIssueReason } from "@nimlat/types/anime-db";
import type { MediaEpisodeUpdatesIssue } from "@nimlat/types/ipc-payloads";

interface BuildMediaEpisodeUpdatesIssueInput {
	mediaId: number;
	hasMalId: boolean;
	queueStatus: string | null;
	failedIssue: MediaEpisodeUpdatesIssue | null;
	isOnline: boolean;
}

// Translate queue/provider facts into the compact renderer-facing issue shape.
// Offline state overrides only generic retryable failures; explicit unsupported
// provider causes must stay visible so users do not retry work that cannot run.
function resolveEpisodeUpdatesReason(input: {
	queueStatus: string | null;
	storedReason?: MediaEpisodeUpdatesIssueReason;
	isOnline: boolean;
}): MediaEpisodeUpdatesIssueReason | undefined {
	if (!input.isOnline && (!input.storedReason || input.storedReason === "transient_failure")) {
		return "network_unavailable";
	}

	if (input.storedReason) {
		return input.storedReason;
	}

	if (input.queueStatus === "failed") {
		return "transient_failure";
	}

	return undefined;
}

export function buildMediaEpisodeUpdatesIssue(input: BuildMediaEpisodeUpdatesIssueInput): MediaEpisodeUpdatesIssue | null {
	// This status is only about canonical episode availability. Missing Jikan
	// episode-video thumbnails are normal provider coverage gaps, not an error
	// or unsupported state, and manual episode refreshes will try them again.
	if (!input.hasMalId) {
		return {
			mediaId:    input.mediaId,
			status:     "unsupported",
			reason:     "missing_mal_id",
			retryCount: 0,
		};
	}

	if (input.queueStatus === "failed") {
		const reason = resolveEpisodeUpdatesReason({
			queueStatus:  input.queueStatus,
			storedReason: input.failedIssue?.reason,
			isOnline:     input.isOnline,
		});
		return {
			mediaId:      input.mediaId,
			status:       reason === "jikan_resource_unavailable"
											? "unsupported"
											: "failed",
			reason,
			errorMessage: input.failedIssue?.errorMessage,
			retryCount:   input.failedIssue?.retryCount || 0,
			lastTriedAt:  input.failedIssue?.lastTriedAt,
		};
	}

	if (input.queueStatus) {
		return {
			mediaId:    input.mediaId,
			status:     input.queueStatus === "processing" ? "processing" : "pending",
			reason:     resolveEpisodeUpdatesReason({
				queueStatus: input.queueStatus,
				isOnline:    input.isOnline,
			}),
			retryCount: 0,
		};
	}

	return null;
}
