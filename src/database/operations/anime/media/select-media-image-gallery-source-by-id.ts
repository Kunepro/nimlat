import type { MediaImageGallerySourceDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { resolveAnimeMediaImageUrl } from "../resolve-media-image-url";

type MediaImageGallerySourceRow = {
	bannerImage: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	mediaId: number;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT media.mediaId,
           media.customImageUrl,
           media.coverImageJson,
           media.bannerImage
    FROM anime_data.media media
    WHERE media.mediaId = ?
      AND media.isStub = 0
`;

// Read only provider image facts needed by the image gallery editor.
export function selectMediaImageGallerySourceById(mediaId: number): MediaImageGallerySourceDto | null {
	const row = getDatabase()
		.prepare(STMT)
		.get(mediaId) as MediaImageGallerySourceRow | undefined;

	if (!row) {
		return null;
	}

	return {
		mediaId:     row.mediaId,
		imageUrl:    resolveAnimeMediaImageUrl(
			row.customImageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
		bannerImage: row.bannerImage ?? undefined,
	};
}
