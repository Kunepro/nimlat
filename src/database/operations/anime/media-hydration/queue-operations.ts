import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import { getDatabase } from "../../../utils/get-db";
import { clearJikanEpisodesSyncState } from "./jikan-episodes-sync";
import { enqueueJikanEpisodeThumbnailsQueue } from "./queue-status";

// Queue every secondary enrichment required after a canonical media upsert.
// Inserts are idempotent; a later scanner/update/targeted refresh resets stale
// non-processing failures and restarts resumable provider state. One bus event at
// the end wakes daemon consumers only after all queue rows are consistent.
export function enqueueMediaHydrationQueues(mediaId: number): void {
	addMediaToIpCharactersQueue(mediaId);
	addMediaToStaffQueue(mediaId);
	addMediaToJikanEpisodesQueue(mediaId);
	enqueueJikanEpisodeThumbnailsQueue(
		mediaId,
		{ resetProgress: true },
	);
	BUS_HydratorQueueChanges.next();
}

function addMediaToStaffQueue(mediaId: number): void {
	const db = getDatabase();

	// noinspection SqlResolve
	db.prepare(`
      INSERT OR IGNORE INTO anime_data.mediaHydrationQueueStaff (mediaId)
      VALUES (?)
	`).run(mediaId);

	// noinspection SqlResolve
	db.prepare(`
      UPDATE anime_data.mediaHydrationQueueStaff
      SET status       = 'pending',
          retryCount   = 0,
          errorMessage = NULL,
          hiddenAt     = NULL,
          lastTriedAt  = NULL
      WHERE mediaId = ?
        AND status <> 'processing'
	`).run(mediaId);
}

// Character hydration is independent from the relation preview embedded in the
// catalog payload and therefore has its own retryable queue.
function addMediaToIpCharactersQueue(mediaId: number): void {
	const db = getDatabase();

	// noinspection SqlResolve
	const stmt = db.prepare(`
      INSERT OR IGNORE INTO anime_data.mediaHydrationQueueCharacters (mediaId)
      VALUES (?)
	`);
	stmt.run(mediaId);

	// Do not reset an in-flight fetch. Any other row represents work that the new
	// canonical payload makes safe to retry from the beginning.
	// noinspection SqlResolve
	db.prepare(`
      UPDATE anime_data.mediaHydrationQueueCharacters
      SET status       = 'pending',
          retryCount   = 0,
          errorMessage = NULL,
          hiddenAt     = NULL,
          lastTriedAt  = NULL
      WHERE mediaId = ?
        AND status <> 'processing'
	`).run(mediaId);
}

// Jikan episode hydration is keyed by canonical media id; provider-native MAL
// identity is resolved by the daemon when it begins the request.
function addMediaToJikanEpisodesQueue(mediaId: number): void {
	const db = getDatabase();

	// noinspection SqlResolve
	const stmt = db.prepare(`
      INSERT OR IGNORE INTO anime_data.mediaHydrationQueueJikanEpisodes (mediaId)
      VALUES (?)
	`);
	stmt.run(mediaId);

	const status = db.prepare<number, { status: string }>(`
      SELECT status
      FROM anime_data.mediaHydrationQueueJikanEpisodes
      WHERE mediaId = ?
	`).get(mediaId)?.status;

	if (status === "processing") {
		return;
	}

	// A new canonical media payload invalidates any incomplete Jikan snapshot. A
	// non-processing row restarts at page 1 so finalization cannot combine pages
	// produced against different media revisions.
	clearJikanEpisodesSyncState(mediaId);
	// noinspection SqlResolve
	db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodes
      SET status        = 'pending',
          retryCount    = 0,
          errorMessage  = NULL,
          failureReason = NULL,
          hiddenAt      = NULL,
          lastTriedAt   = NULL
      WHERE mediaId = ?
	`).run(mediaId);
}
