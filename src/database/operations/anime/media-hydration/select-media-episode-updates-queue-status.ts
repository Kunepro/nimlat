import { getGroupJikanEpisodesQueueStatus } from "./queue-status";

// Renderer-facing queue status is deliberately nullable so missing rows do not
// leak database-specific absence semantics beyond the anime_data operation.
export function selectMediaEpisodeUpdatesQueueStatus(mediaId: number): string | null {
	return getGroupJikanEpisodesQueueStatus(mediaId)?.status || null;
}
