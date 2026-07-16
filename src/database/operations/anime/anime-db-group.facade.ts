import { AnimeDbGroupMutationFacade } from "./anime-db-group-mutation.facade";
import { AnimeDbGroupReadFacade } from "./anime-db-group-read.facade";

// Official AnimeDB group panel. User-owned grouping operations live under
// UserDbFacade; this composite only indexes canonical anime_data group rows.
export const AnimeDbGroupFacade = {
	...AnimeDbGroupReadFacade,
	...AnimeDbGroupMutationFacade,
} as const;
