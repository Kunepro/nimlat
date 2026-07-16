import { SUPPORTED_ANIMATED_MEDIA_FORMATS } from "@nimlat/constants/supported-media-formats";
import { MediaImagePreviewDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";

type MediaImagePreviewRow = MediaImagePreviewDto;

const SUPPORTED_FORMAT_SQL_LIST = SUPPORTED_ANIMATED_MEDIA_FORMATS.map((format) => `'${ format }'`).join(", ");
const PREFERRED_MEDIA_TITLE_SQL = preferredMediaTitleSql(
	"media",
	"'Media ' || media.mediaId",
);

// noinspection SqlResolve
const STMT = sql`
    SELECT media.mediaId,
           ${ PREFERRED_MEDIA_TITLE_SQL } AS name,
           media.coverImageJson,
           media.bannerImage
    FROM anime_data.media media
    WHERE media.mediaId IN (SELECT value FROM json_each(?))
      AND media.format IN (${ SUPPORTED_FORMAT_SQL_LIST })
    ORDER BY LOWER(${ PREFERRED_MEDIA_TITLE_SQL }) ASC
`;

// Read only the image fields needed by a caller-supplied bounded media set. Group
// galleries use this instead of loading one full inspection model per member.
export function selectMediaImagePreviewsByIds(mediaIds: number[]): MediaImagePreviewDto[] {
	if (mediaIds.length === 0) {
		return [];
	}

	return getDatabase()
		.prepare<[ string ], MediaImagePreviewRow>(STMT)
		.all(JSON.stringify(mediaIds));
}
