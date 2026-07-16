import { BUS_CatalogMediaIngested } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import type { AnimeDbMediaIngestionSource } from "@nimlat/types/anime-db";

export interface AnimeDbMediaIngestionOptions {
	source: AnimeDbMediaIngestionSource;
}

// Shared boundary for complete AniList media payloads produced by the full
// scanner, incremental updater, or targeted refreshes. The DB upsert also queues
// secondary provider enrichment; this helper then publishes one semantic event
// for grouping, Release Watch, and renderer-visible catalog side effects.
// Scan/update cursor policy remains with the caller.
export function ingestAnimeDbMedia(
	media: AniListMedia,
	options: AnimeDbMediaIngestionOptions = { source: "anime-db-populator" },
): number | undefined {
	const mediaId = AnimeDbFacade.media.upsertMedia(media);
	if (mediaId === undefined) {
		return undefined;
	}

	BUS_CatalogMediaIngested.next({
		mediaId,
		idAniList: media.id,
		idMal:     media.idMal,
		source:    options.source,
	});

	return mediaId;
}
