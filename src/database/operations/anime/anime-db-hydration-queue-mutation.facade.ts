import { AnimeDbHydrationQueueEnqueueFacade } from "./anime-db-hydration-queue-enqueue.facade";
import { AnimeDbHydrationQueueFailureFacade } from "./anime-db-hydration-queue-failure.facade";
import { AnimeDbHydrationQueueLifecycleFacade } from "./anime-db-hydration-queue-lifecycle.facade";
import { AnimeDbHydrationQueueProgressFacade } from "./anime-db-hydration-queue-progress.facade";

// Mutation panel kept backward-compatible for AnimeDbHydrationQueueFacade.
// Subfacades separate queue lifecycle, enqueue, failure, and progress processes.
export const AnimeDbHydrationQueueMutationFacade = {
	...AnimeDbHydrationQueueLifecycleFacade,
	...AnimeDbHydrationQueueEnqueueFacade,
	...AnimeDbHydrationQueueFailureFacade,
	...AnimeDbHydrationQueueProgressFacade,
} as const;
