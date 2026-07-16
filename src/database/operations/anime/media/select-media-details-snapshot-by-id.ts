import type { MediaDetailsSnapshotDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";
import { resolveAnimeMediaImageUrl } from "../resolve-media-image-url";

type MediaDetailsSnapshotRow = {
	bannerImage: string | null;
	coverImageJson: string | null;
	customImageUrl: string | null;
	description: string | null;
	mediaId: number;
	name: string | null;
};

const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

// noinspection SqlResolve
const STMT = sql`
    SELECT media.mediaId,
           ${ PREFERRED_MEDIA_TITLE_SQL } AS name,
           media.description,
           media.customImageUrl,
           media.coverImageJson,
           media.bannerImage
    FROM anime_data.media media
    WHERE media.mediaId = ?
      AND media.isStub = 0
`;

// Compact canonical media snapshot for edit rollback/reset flows.
export function selectMediaDetailsSnapshotById(mediaId: number): MediaDetailsSnapshotDto | null {
	const row = getDatabase()
		.prepare(STMT)
		.get(mediaId) as MediaDetailsSnapshotRow | undefined;

	if (!row) {
		return null;
	}

	return {
		mediaId:     row.mediaId,
		name:        row.name ?? `Media ${ row.mediaId }`,
		description: row.description ?? undefined,
		imageUrl:    resolveAnimeMediaImageUrl(
			row.customImageUrl,
			row.coverImageJson,
			row.bannerImage,
		),
	};
}
