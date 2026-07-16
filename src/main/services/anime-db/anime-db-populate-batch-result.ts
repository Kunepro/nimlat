import type { AnimeDbPopulateBatchEvent } from "./anime-db-populate-batch-processor";

export interface AnimeDbPopulateBatchResult {
	stopped: boolean;
}

export function createAnimeDbPopulateBatchResult(): AnimeDbPopulateBatchResult {
	return { stopped: false };
}

export function applyAnimeDbPopulateBatchEvent(
	result: AnimeDbPopulateBatchResult,
	event: AnimeDbPopulateBatchEvent,
): AnimeDbPopulateBatchResult {
	if (event.kind !== "stopped") {
		return result;
	}

	return { stopped: true };
}

// A stopped batch may have persisted individual media rows, but it must not advance the scan checkpoint.
// Replaying the current batch is cheaper than risking a skipped AniList ID after pause/abort.
export function shouldCommitAnimeDbPopulateBatch(result: AnimeDbPopulateBatchResult): boolean {
	return !result.stopped;
}
