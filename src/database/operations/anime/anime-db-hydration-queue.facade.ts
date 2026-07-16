import { AnimeDbHydrationQueueMutationFacade } from "./anime-db-hydration-queue-mutation.facade";
import { AnimeDbHydrationQueueReadFacade } from "./anime-db-hydration-queue-read.facade";

// Backward-compatible queue panel for AnimeDbHydrationFacade. Read/write
// subfacades keep retry queues navigable without exposing queue operations to callers.
export const AnimeDbHydrationQueueFacade = {
	...AnimeDbHydrationQueueReadFacade,
	...AnimeDbHydrationQueueMutationFacade,
} as const;
