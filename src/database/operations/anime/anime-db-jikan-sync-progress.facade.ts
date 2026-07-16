import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	getNextJikanEpisodeSynopsisCandidate,
	updateJikanEpisodesSyncEpisodesProgress,
	updateJikanEpisodesSyncSynopsisProgress,
} from "./media-hydration/jikan-episodes-sync";

// Progress facade for resumable Jikan pagination and synopsis enrichment.
export const AnimeDbJikanSyncProgressFacade = {
	getNextJikanEpisodeSynopsisCandidate(
		mediaId: number,
		syncRunId: string,
		lastSynopsisEpisodeNumber: number,
	): { episodeNumber: number } | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getNextJikanEpisodeSynopsisCandidate",
			() => getNextJikanEpisodeSynopsisCandidate(
				mediaId,
				syncRunId,
				lastSynopsisEpisodeNumber,
			),
			{
				mediaId,
				syncRunId,
				lastSynopsisEpisodeNumber,
			},
		);
	},

	updateJikanEpisodesSyncEpisodesProgress(
		mediaId: number,
		lastEpisodesPage: number,
		hasNextEpisodesPage: boolean,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.updateJikanEpisodesSyncEpisodesProgress",
			() => updateJikanEpisodesSyncEpisodesProgress(
				mediaId,
				lastEpisodesPage,
				hasNextEpisodesPage,
			),
			{
				mediaId,
				lastEpisodesPage,
				hasNextEpisodesPage,
			},
		);
	},

	updateJikanEpisodesSyncSynopsisProgress(
		mediaId: number,
		lastSynopsisEpisodeNumber: number,
		hasNextSynopsisEpisode: boolean,
	): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.updateJikanEpisodesSyncSynopsisProgress",
			() => updateJikanEpisodesSyncSynopsisProgress(
				mediaId,
				lastSynopsisEpisodeNumber,
				hasNextSynopsisEpisode,
			),
			{
				mediaId,
				lastSynopsisEpisodeNumber,
				hasNextSynopsisEpisode,
			},
		);
	},
} as const;
