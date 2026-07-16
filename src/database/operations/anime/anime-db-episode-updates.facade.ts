import { MediaEpisodeUpdatesSupportFactsDto } from "@nimlat/types/anime-db";
import { MediaEpisodeUpdatesIssue } from "@nimlat/types/ipc-payloads";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { retryMediaEpisodeUpdates } from "./media-hydration/retry-media-episode-updates";
import { selectMediaEpisodeUpdatesIssue } from "./media-hydration/select-media-episode-updates-issue";
import { selectMediaEpisodeUpdatesManualPriority } from "./media-hydration/select-media-episode-updates-manual-priority";
import { selectMediaEpisodeUpdatesQueueStatus } from "./media-hydration/select-media-episode-updates-queue-status";
import { selectMediaEpisodeUpdatesSupportFactsById } from "./media/select-media-episode-updates-support-facts-by-id";

// Renderer-facing episode-update support/read facade. The queue tables remain
// implementation detail behind named DB operations.
export const AnimeDbEpisodeUpdatesFacade = {
	getMediaEpisodeUpdatesIssue(mediaId: number): MediaEpisodeUpdatesIssue | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediaEpisodeUpdatesIssue",
			() => selectMediaEpisodeUpdatesIssue(mediaId),
			{ mediaId },
		);
	},

	getMediaEpisodeUpdatesSupportFacts(mediaId: number): MediaEpisodeUpdatesSupportFactsDto | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediaEpisodeUpdatesSupportFacts",
			() => selectMediaEpisodeUpdatesSupportFactsById(mediaId),
			{ mediaId },
		);
	},

	retryMediaEpisodeUpdates(mediaId: number): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.retryMediaEpisodeUpdates",
			() => retryMediaEpisodeUpdates(mediaId),
			{ mediaId },
		);
	},

	getMediaEpisodeUpdatesQueueStatus(mediaId: number): string | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.getMediaEpisodeUpdatesQueueStatus",
			() => selectMediaEpisodeUpdatesQueueStatus(mediaId),
			{ mediaId },
		);
	},

	hasMediaEpisodeUpdatesManualPriority(mediaId: number): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.mediasHydration.hasMediaEpisodeUpdatesManualPriority",
			() => selectMediaEpisodeUpdatesManualPriority(mediaId),
			{ mediaId },
		);
	},
} as const;
