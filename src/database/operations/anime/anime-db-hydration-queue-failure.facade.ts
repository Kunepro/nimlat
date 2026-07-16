import type { MediaEpisodeUpdatesIssueReason } from "@nimlat/types/anime-db";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	markFailedGroupJikanEpisodesQueue,
	markFailedJikanEpisodeThumbnailsQueue,
	updateFailedGroupCharactersQueue,
	updateFailedGroupJikanEpisodesQueue,
	updateFailedJikanEpisodeThumbnailsQueue,
	updateFailedStaffQueue,
} from "./media-hydration/queue-status";

// Failure facade for retryable hydration rows. Error classification belongs in
// daemon/services and persistence/backoff belongs in queue-status operations.
export const AnimeDbHydrationQueueFailureFacade = {
	updateFailedGroupCharactersQueue(mediaId: number, errorMessage: string): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.updateFailedGroupCharactersQueue",
			() => updateFailedGroupCharactersQueue(
				mediaId,
				errorMessage,
			),
			{
				mediaId,
				errorMessage,
			},
		);
	},

	updateFailedStaffQueue(mediaId: number, errorMessage: string): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.updateFailedStaffQueue",
			() => updateFailedStaffQueue(
				mediaId,
				errorMessage,
			),
			{
				mediaId,
				errorMessage,
			},
		);
	},

	updateFailedGroupJikanEpisodesQueue(
		mediaId: number,
		errorMessage: string,
		failureReason?: MediaEpisodeUpdatesIssueReason,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.updateFailedGroupJikanEpisodesQueue",
			() => updateFailedGroupJikanEpisodesQueue(
				mediaId,
				errorMessage,
				failureReason,
			),
			{
				mediaId,
				errorMessage,
				failureReason,
			},
		);
	},

	updateFailedJikanEpisodeThumbnailsQueue(
		mediaId: number,
		errorMessage: string,
		failureReason?: MediaEpisodeUpdatesIssueReason,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.updateFailedJikanEpisodeThumbnailsQueue",
			() => updateFailedJikanEpisodeThumbnailsQueue(
				mediaId,
				errorMessage,
				failureReason,
			),
			{
				mediaId,
				errorMessage,
				failureReason,
			},
		);
	},

	markFailedGroupJikanEpisodesQueue(
		mediaId: number,
		errorMessage: string,
		failureReason: MediaEpisodeUpdatesIssueReason,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.markFailedGroupJikanEpisodesQueue",
			() => markFailedGroupJikanEpisodesQueue(
				mediaId,
				errorMessage,
				failureReason,
			),
			{
				mediaId,
				errorMessage,
				failureReason,
			},
		);
	},

	markFailedJikanEpisodeThumbnailsQueue(
		mediaId: number,
		errorMessage: string,
		failureReason: MediaEpisodeUpdatesIssueReason,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.markFailedJikanEpisodeThumbnailsQueue",
			() => markFailedJikanEpisodeThumbnailsQueue(
				mediaId,
				errorMessage,
				failureReason,
			),
			{
				mediaId,
				errorMessage,
				failureReason,
			},
		);
	},
} as const;
