import { enqueueGroupJikanEpisodesQueue } from "./queue-status";

// Retry is represented by re-enqueueing the episode hydration queue with manual
// priority; the queue operation owns the concrete reset semantics.
export function retryMediaEpisodeUpdates(mediaId: number): boolean {
	enqueueGroupJikanEpisodesQueue(
		mediaId,
		true,
	);
	return true;
}
