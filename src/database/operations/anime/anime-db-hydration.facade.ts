import { AnimeDbEpisodeUpdatesFacade } from "./anime-db-episode-updates.facade";
import { AnimeDbErroredContentFacade } from "./anime-db-errored-content.facade";
import { AnimeDbHydrationMediaFacade } from "./anime-db-hydration-media.facade";
import { AnimeDbHydrationQueueFacade } from "./anime-db-hydration-queue.facade";
import { AnimeDbJikanSyncFacade } from "./anime-db-jikan-sync.facade";

// Backward-compatible hydration panel. The subfacades below keep queue,
// errored-content, Jikan-sync, episode-status, and media-lookup concerns isolated.
export const AnimeDbHydrationFacade = {
	queue:          AnimeDbHydrationQueueFacade,
	episodeUpdates: AnimeDbEpisodeUpdatesFacade,
	erroredContent: AnimeDbErroredContentFacade,
	jikanSync:      AnimeDbJikanSyncFacade,
	media:          AnimeDbHydrationMediaFacade,

	...AnimeDbHydrationQueueFacade,
	...AnimeDbEpisodeUpdatesFacade,
	...AnimeDbErroredContentFacade,
	...AnimeDbJikanSyncFacade,
	...AnimeDbHydrationMediaFacade,
} as const;
