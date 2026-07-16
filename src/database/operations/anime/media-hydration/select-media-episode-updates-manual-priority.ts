import { hasGroupJikanEpisodesQueueManualPriority } from "./queue-status";

// Keep the manual-priority check named by the renderer-facing feature, not by
// the underlying queue table, so facade callers remain domain-oriented.
export function selectMediaEpisodeUpdatesManualPriority(mediaId: number): boolean {
	return hasGroupJikanEpisodesQueueManualPriority(mediaId);
}
