import {
	getGroupCharactersQueueCount,
	getGroupJikanEpisodesQueueCount,
	getJikanEpisodeThumbnailsQueueCount,
	getStaffQueueCount,
} from "./queue-status";

// Boolean helpers are retained for callers that need queue existence rather
// than counts; readiness and retry-budget policy remains in queue-status.
export function hasGroupCharactersQueueEntries(): boolean {
	return getGroupCharactersQueueCount() > 0;
}

export function hasStaffQueueEntries(): boolean {
	return getStaffQueueCount() > 0;
}

export function hasGroupJikanEpisodesQueueEntries(): boolean {
	return getGroupJikanEpisodesQueueCount() > 0;
}

export function hasJikanEpisodeThumbnailsQueueEntries(): boolean {
	return getJikanEpisodeThumbnailsQueueCount() > 0;
}
