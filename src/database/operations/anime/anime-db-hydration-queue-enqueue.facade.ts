import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	enqueueGroupJikanEpisodesQueue,
	enqueueJikanEpisodeThumbnailsQueue,
} from "./media-hydration/queue-status";

// Enqueue facade for queue producers. Priority policy and duplicate handling
// remain inside queue-status operations, not in this logged boundary.
export const AnimeDbHydrationQueueEnqueueFacade = {
	enqueueGroupJikanEpisodesQueue(mediaId: number, isManualPriority: boolean): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.enqueueGroupJikanEpisodesQueue",
			() => enqueueGroupJikanEpisodesQueue(
				mediaId,
				isManualPriority,
			),
			{
				mediaId,
				isManualPriority,
			},
		);
	},

	enqueueJikanEpisodeThumbnailsQueue(mediaId: number, options?: {
		isManualPriority?: boolean;
		resetProgress?: boolean;
	}): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.enqueueJikanEpisodeThumbnailsQueue",
			() => enqueueJikanEpisodeThumbnailsQueue(
				mediaId,
				options,
			),
			{
				mediaId,
				options,
			},
		);
	},
} as const;
