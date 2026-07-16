import { MediaGroupSummaryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";

type GroupSummaryRow = MediaGroupSummaryDto;

const PREFERRED_GROUP_BASE_TITLE_SQL = preferredMediaTitleSql(
	"baseMedia",
	"groups.name",
);

// noinspection SqlResolve
const STMT = sql`
    SELECT groupMedia.mediaId,
           groups.id                                              AS groupId,
           COALESCE(userGroupOverrides.name, ${ PREFERRED_GROUP_BASE_TITLE_SQL }) AS name,
           groups.imageUrl AS imageUrl
    FROM anime_data.groupMedia groupMedia
             INNER JOIN anime_data.groups groups
                        ON groups.id = groupMedia.groupId
             LEFT JOIN anime_data.media baseMedia
                       ON baseMedia.mediaId = groups.baseMediaId
             LEFT JOIN userGroupOverrides
                       ON userGroupOverrides.animeGroupId = groups.id
    WHERE groupMedia.mediaId IN (SELECT value FROM json_each(?))
    ORDER BY groupMedia.mediaId ASC, LOWER(COALESCE(userGroupOverrides.name, ${ PREFERRED_GROUP_BASE_TITLE_SQL })) ASC
`;

// Resolve current visible anime-mode Group memberships for a bounded media set.
export function selectGroupSummariesByMediaIds(mediaIds: number[]): MediaGroupSummaryDto[] {
	if (mediaIds.length === 0) {
		return [];
	}

	return getDatabase()
		.prepare<[ string ], GroupSummaryRow>(STMT)
		.all(JSON.stringify(mediaIds));
}
