import type { JikanEpisodesSyncStateDto } from "@nimlat/types/anime-db";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import {
	clearJikanEpisodesSyncState,
	clearJikanEpisodeThumbnailsForMedia,
	finalizeJikanEpisodesSync,
	getOrCreateJikanEpisodesSyncState,
} from "./media-hydration/jikan-episodes-sync";

// Lifecycle facade for resumable Jikan episode sync runs. Run identity and
// finalization remain DB-owned so daemon restarts stay deterministic.
export const AnimeDbJikanSyncLifecycleFacade = {
	getOrCreateJikanEpisodesSyncState(mediaId: number): JikanEpisodesSyncStateDto {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getOrCreateJikanEpisodesSyncState",
			() => getOrCreateJikanEpisodesSyncState(mediaId),
			{ mediaId },
		);
	},

	clearJikanEpisodeThumbnailsForMedia(mediaId: number): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.clearJikanEpisodeThumbnailsForMedia",
			() => clearJikanEpisodeThumbnailsForMedia(mediaId),
			{ mediaId },
		);
	},

	finalizeJikanEpisodesSync(
		mediaId: number,
		syncRunId: string,
	): { writtenRows: number; deletedRows: number } {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.finalizeJikanEpisodesSync",
			() => finalizeJikanEpisodesSync(
				mediaId,
				syncRunId,
			),
			{
				mediaId,
				syncRunId,
			},
		);
	},

	clearJikanEpisodesSyncState(mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.clearJikanEpisodesSyncState",
			() => clearJikanEpisodesSyncState(mediaId),
			{ mediaId },
		);
	},
} as const;
