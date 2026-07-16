import {
	deleteFromSimpleHydrationQueue,
	getMediasFromSimpleHydrationQueue,
	getSimpleHydrationQueueCount,
	markSimpleHydrationQueueProcessing,
	updateFailedSimpleHydrationQueue,
} from "./simple-hydration-queue-operations";

export {
	deleteFromGroupJikanEpisodesQueue,
	enqueueGroupJikanEpisodesQueue,
	getFailedGroupJikanEpisodesQueueEntry,
	getGroupJikanEpisodesQueueCount,
	getGroupJikanEpisodesQueueStatus,
	getMediasFromGroupJikanEpisodesQueue,
	getNextGroupJikanEpisodesRetryAt,
	hasGroupJikanEpisodesQueueManualPriority,
	markFailedGroupJikanEpisodesQueue,
	markGroupJikanEpisodesQueueProcessing,
	updateFailedGroupJikanEpisodesQueue,
} from "./jikan-episodes-queue";
export {
	deleteFromJikanEpisodeThumbnailsQueue,
	enqueueJikanEpisodeThumbnailsQueue,
	getJikanEpisodeThumbnailsQueueCount,
	getJikanEpisodeThumbnailsQueueEntry,
	getMediasFromJikanEpisodeThumbnailsQueue,
	getNextJikanEpisodeThumbnailsRetryAt,
	markFailedJikanEpisodeThumbnailsQueue,
	markJikanEpisodeThumbnailsQueueProcessing,
	updateFailedJikanEpisodeThumbnailsQueue,
	updateJikanEpisodeThumbnailsProgress,
} from "./jikan-episode-thumbnails-queue";

// Character and staff queues share the same simple lifecycle implementation;
// named operations keep table selection inside the database layer.
export function getGroupCharactersQueueCount(): number {
	return getSimpleHydrationQueueCount("mediaHydrationQueueCharacters");
}

export function getStaffQueueCount(): number {
	return getSimpleHydrationQueueCount("mediaHydrationQueueStaff");
}

export function getMediasFromGroupCharactersQueue(): number[] {
	return getMediasFromSimpleHydrationQueue("mediaHydrationQueueCharacters");
}

export function getMediasFromStaffQueue(): number[] {
	return getMediasFromSimpleHydrationQueue("mediaHydrationQueueStaff");
}

// Claiming before network work prevents periodic sweeps from starting the same
// media again while its daemon request is still in flight.
export function markGroupCharactersQueueProcessing(mediaId: number): void {
	markSimpleHydrationQueueProcessing(
		"mediaHydrationQueueCharacters",
		mediaId,
	);
}

export function markStaffQueueProcessing(mediaId: number): void {
	markSimpleHydrationQueueProcessing(
		"mediaHydrationQueueStaff",
		mediaId,
	);
}

// Successful enrichment deletes durable work; failed work stays present with
// retry metadata so Errored Content can expose it.
export function deleteFromGroupCharactersQueue(mediaId: number): void {
	deleteFromSimpleHydrationQueue(
		"mediaHydrationQueueCharacters",
		mediaId,
	);
}

export function deleteFromStaffQueue(mediaId: number): void {
	deleteFromSimpleHydrationQueue(
		"mediaHydrationQueueStaff",
		mediaId,
	);
}

// Character and staff failures use the same bounded retry transition while
// preserving their separate queue ownership.
export function updateFailedGroupCharactersQueue(mediaId: number, errorMessage: string): void {
	updateFailedSimpleHydrationQueue(
		"mediaHydrationQueueCharacters",
		mediaId,
		errorMessage,
	);
}

export function updateFailedStaffQueue(mediaId: number, errorMessage: string): void {
	updateFailedSimpleHydrationQueue(
		"mediaHydrationQueueStaff",
		mediaId,
		errorMessage,
	);
}
