import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { updateMediaDetails } from "./media/update-media-details";
import { upsertAniListMedia } from "./media/upsert-ani-list-media";
import { upsertAniListMediaBatch } from "./media/upsert-ani-list-media-batch";

// Media writes are limited to ingestion and admin/user edit surfaces. The
// facade logs the boundary; mutation semantics remain in the DB operations.
export const AnimeDbMediaWriteFacade = {
	upsertMedia(media: AniListMedia): number | undefined {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.upsertMedia",
			() => upsertAniListMedia(media),
			{ mediaId: media.id },
		);
	},

	upsertBatchOfMedias(medias: AniListMedia[]): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.media.upsertBatchOfMedias",
			() => upsertAniListMediaBatch(medias),
			{ mediaIds: medias.map(media => media.id) },
		);
	},

	updateDetails(mediaId: number, details: {
		name: string;
		description?: string;
		customImageUrl?: string;
	}): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.media.updateDetails",
			() => updateMediaDetails(
				mediaId,
				details,
			),
			{ mediaId },
		);
	},
} as const;
