import { MediaEpisodeUpdatesIssue } from "@nimlat/types/ipc-payloads";
import { getFailedGroupJikanEpisodesQueueEntry } from "./queue-status";

// Convert the failed Jikan episodes queue row into the narrow renderer issue DTO.
export function selectMediaEpisodeUpdatesIssue(mediaId: number): MediaEpisodeUpdatesIssue | null {
	const row = getFailedGroupJikanEpisodesQueueEntry(mediaId);
	if (!row) {
		return null;
	}

	return {
		mediaId,
		reason:       row.failureReason ?? undefined,
		errorMessage: row.errorMessage || undefined,
		retryCount:   row.retryCount,
		lastTriedAt:  row.lastTriedAt ?? undefined,
	};
}
