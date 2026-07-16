import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	hasGroupCharactersQueueEntries,
	hasGroupJikanEpisodesQueueEntries,
	hasJikanEpisodeThumbnailsQueueEntries,
	hasStaffQueueEntries,
} from "./media-hydration/queue-check";
import {
	getGroupCharactersQueueCount,
	getGroupJikanEpisodesQueueCount,
	getJikanEpisodeThumbnailsQueueCount,
	getJikanEpisodeThumbnailsQueueEntry,
	getMediasFromGroupCharactersQueue,
	getMediasFromGroupJikanEpisodesQueue,
	getMediasFromJikanEpisodeThumbnailsQueue,
	getMediasFromStaffQueue,
	getNextGroupJikanEpisodesRetryAt,
	getNextJikanEpisodeThumbnailsRetryAt,
	getStaffQueueCount,
} from "./media-hydration/queue-status";

// Read-only queue facade for daemon polling and diagnostics. These methods
// intentionally return bounded ids/status values instead of queue row payloads.
export const AnimeDbHydrationQueueReadFacade = {
	getGroupCharactersQueueCount(): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getGroupCharactersQueueCount",
			() => getGroupCharactersQueueCount(),
		);
	},

	getStaffQueueCount(): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getStaffQueueCount",
			() => getStaffQueueCount(),
		);
	},

	getGroupJikanEpisodesQueueCount(): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getGroupJikanEpisodesQueueCount",
			() => getGroupJikanEpisodesQueueCount(),
		);
	},

	getJikanEpisodeThumbnailsQueueCount(): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getJikanEpisodeThumbnailsQueueCount",
			() => getJikanEpisodeThumbnailsQueueCount(),
		);
	},

	getNextGroupJikanEpisodesRetryAt(): number | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getNextGroupJikanEpisodesRetryAt",
			() => getNextGroupJikanEpisodesRetryAt(),
		);
	},

	getNextJikanEpisodeThumbnailsRetryAt(): number | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getNextJikanEpisodeThumbnailsRetryAt",
			() => getNextJikanEpisodeThumbnailsRetryAt(),
		);
	},

	getMediasFromGroupCharactersQueue(): number[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediasFromGroupCharactersQueue",
			() => getMediasFromGroupCharactersQueue(),
		);
	},

	getMediasFromStaffQueue(): number[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediasFromStaffQueue",
			() => getMediasFromStaffQueue(),
		);
	},

	getMediasFromGroupJikanEpisodesQueue(): number[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediasFromGroupJikanEpisodesQueue",
			() => getMediasFromGroupJikanEpisodesQueue(),
		);
	},

	getMediasFromJikanEpisodeThumbnailsQueue(): number[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediasFromJikanEpisodeThumbnailsQueue",
			() => getMediasFromJikanEpisodeThumbnailsQueue(),
		);
	},

	getJikanEpisodeThumbnailsQueueEntry(mediaId: number) {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getJikanEpisodeThumbnailsQueueEntry",
			() => getJikanEpisodeThumbnailsQueueEntry(mediaId),
			{ mediaId },
		);
	},

	hasGroupCharactersQueueEntries(): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.hasGroupCharactersQueueEntries",
			() => hasGroupCharactersQueueEntries(),
		);
	},

	hasStaffQueueEntries(): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.hasStaffQueueEntries",
			() => hasStaffQueueEntries(),
		);
	},

	hasGroupJikanEpisodesQueueEntries(): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.hasGroupJikanEpisodesQueueEntries",
			() => hasGroupJikanEpisodesQueueEntries(),
		);
	},

	hasJikanEpisodeThumbnailsQueueEntries(): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.hasJikanEpisodeThumbnailsQueueEntries",
			() => hasJikanEpisodeThumbnailsQueueEntries(),
		);
	},
} as const;
