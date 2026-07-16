import { AnimeDbJikanSyncLifecycleFacade } from "./anime-db-jikan-sync-lifecycle.facade";
import { AnimeDbJikanSyncPageFacade } from "./anime-db-jikan-sync-page.facade";
import { AnimeDbJikanSyncProgressFacade } from "./anime-db-jikan-sync-progress.facade";

// Jikan episode sync facade panel. Staging/finalize semantics remain inside the
// DB operations so daemons only orchestrate provider calls and queue state.
export const AnimeDbJikanSyncFacade = {
	...AnimeDbJikanSyncLifecycleFacade,
	...AnimeDbJikanSyncPageFacade,
	...AnimeDbJikanSyncProgressFacade,
} as const;
