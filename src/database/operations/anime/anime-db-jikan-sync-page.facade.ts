import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "@nimlat/types/jikan-api";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	applyJikanEpisodeSynopsisToStagingEpisode,
	applyJikanEpisodeVideoThumbnailsToEpisodesPage,
	applyJikanEpisodeVideoThumbnailsToStagingPage,
	upsertJikanEpisodesStagingPage,
} from "./media-hydration/jikan-episodes-sync";

// Page/staging facade for Jikan provider payloads. Conversion and write safety
// stay inside jikan-episodes-sync operations, not daemon orchestration code.
export const AnimeDbJikanSyncPageFacade = {
	upsertJikanEpisodesStagingPage(
		mediaId: number,
		syncRunId: string,
		episodes: JikanEpisode[],
	): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.upsertJikanEpisodesStagingPage",
			() => upsertJikanEpisodesStagingPage(
				mediaId,
				syncRunId,
				episodes,
			),
			{
				mediaId,
				syncRunId,
				episodesCount: episodes.length,
			},
		);
	},

	applyJikanEpisodeVideoThumbnailsToStagingPage(
		mediaId: number,
		syncRunId: string,
		videos: JikanEpisodeVideo[],
	): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.applyJikanEpisodeVideoThumbnailsToStagingPage",
			() => applyJikanEpisodeVideoThumbnailsToStagingPage(
				mediaId,
				syncRunId,
				videos,
			),
			{
				mediaId,
				syncRunId,
				videosCount: videos.length,
			},
		);
	},

	applyJikanEpisodeVideoThumbnailsToEpisodesPage(
		mediaId: number,
		videos: JikanEpisodeVideo[],
	): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.applyJikanEpisodeVideoThumbnailsToEpisodesPage",
			() => applyJikanEpisodeVideoThumbnailsToEpisodesPage(
				mediaId,
				videos,
			),
			{
				mediaId,
				videosCount: videos.length,
			},
		);
	},

	applyJikanEpisodeSynopsisToStagingEpisode(
		mediaId: number,
		syncRunId: string,
		episodeNumber: number,
		details: Pick<JikanEpisode, "duration" | "synopsis">,
	): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.applyJikanEpisodeSynopsisToStagingEpisode",
			() => applyJikanEpisodeSynopsisToStagingEpisode(
				mediaId,
				syncRunId,
				episodeNumber,
				details,
			),
			{
				mediaId,
				syncRunId,
				episodeNumber,
			},
		);
	},
} as const;
