import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { updateJikanEpisodeThumbnailsProgress } from "./media-hydration/queue-status";

// Progress facade for resumable Jikan episode thumbnail pagination.
export const AnimeDbHydrationQueueProgressFacade = {
	updateJikanEpisodeThumbnailsProgress(
		mediaId: number,
		lastPage: number,
		hasNextPage: boolean,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.updateJikanEpisodeThumbnailsProgress",
			() => updateJikanEpisodeThumbnailsProgress(
				mediaId,
				lastPage,
				hasNextPage,
			),
			{
				mediaId,
				lastPage,
				hasNextPage,
			},
		);
	},
} as const;
