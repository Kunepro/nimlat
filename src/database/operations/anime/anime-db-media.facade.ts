import { AnimeDbMediaReadFacade } from "./anime-db-media-read.facade";
import { AnimeDbMediaRelationsFacade } from "./anime-db-media-relations.facade";
import { AnimeDbMediaWriteFacade } from "./anime-db-media-write.facade";

// Canonical media control panel. Relations stay nested for the established
// `AnimeDbFacade.media.relations.*` API while read/write panels remain isolated.
export const AnimeDbMediaFacade = {
	relations: AnimeDbMediaRelationsFacade,
	...AnimeDbMediaReadFacade,
	...AnimeDbMediaWriteFacade,
} as const;
