import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	deleteFromGroupCharactersQueue,
	deleteFromGroupJikanEpisodesQueue,
	deleteFromJikanEpisodeThumbnailsQueue,
	deleteFromStaffQueue,
	markGroupCharactersQueueProcessing,
	markGroupJikanEpisodesQueueProcessing,
	markJikanEpisodeThumbnailsQueueProcessing,
	markStaffQueueProcessing,
} from "./media-hydration/queue-status";

// Queue lifecycle facade for claim/delete transitions. Daemons decide when a
// row moves; DB operations own the persisted transition details.
export const AnimeDbHydrationQueueLifecycleFacade = {
	deleteFromGroupCharactersQueue(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.deleteFromGroupCharactersQueue",
			() => deleteFromGroupCharactersQueue(mediaId),
			{ mediaId },
		);
	},

	deleteFromStaffQueue(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.deleteFromStaffQueue",
			() => deleteFromStaffQueue(mediaId),
			{ mediaId },
		);
	},

	deleteFromGroupJikanEpisodesQueue(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.deleteFromGroupJikanEpisodesQueue",
			() => deleteFromGroupJikanEpisodesQueue(mediaId),
			{ mediaId },
		);
	},

	deleteFromJikanEpisodeThumbnailsQueue(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.deleteFromJikanEpisodeThumbnailsQueue",
			() => deleteFromJikanEpisodeThumbnailsQueue(mediaId),
			{ mediaId },
		);
	},

	markGroupCharactersQueueProcessing(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.markGroupCharactersQueueProcessing",
			() => markGroupCharactersQueueProcessing(mediaId),
			{ mediaId },
		);
	},

	markStaffQueueProcessing(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.markStaffQueueProcessing",
			() => markStaffQueueProcessing(mediaId),
			{ mediaId },
		);
	},

	markGroupJikanEpisodesQueueProcessing(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.markGroupJikanEpisodesQueueProcessing",
			() => markGroupJikanEpisodesQueueProcessing(mediaId),
			{ mediaId },
		);
	},

	markJikanEpisodeThumbnailsQueueProcessing(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.markJikanEpisodeThumbnailsQueueProcessing",
			() => markJikanEpisodeThumbnailsQueueProcessing(mediaId),
			{ mediaId },
		);
	},
} as const;
