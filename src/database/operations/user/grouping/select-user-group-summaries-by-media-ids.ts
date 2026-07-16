import { MediaGroupSummaryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type UserGroupSummaryRow = MediaGroupSummaryDto;


// noinspection SqlResolve
const STMT = sql`
    SELECT userGroupMedias.mediaId,
           userGroups.id       AS groupId,
           userGroups.name     AS name,
           userGroups.imageUrl AS imageUrl
    FROM userGroupMedias
             INNER JOIN userGroups
                        ON userGroups.id = userGroupMedias.groupId
    WHERE userGroupMedias.mediaId IN (SELECT value FROM json_each(?))
    ORDER BY userGroupMedias.mediaId ASC, LOWER(userGroups.name) ASC
`;

// Resolve current user-mode Group memberships for a bounded media set.
export function selectUserGroupSummariesByMediaIds(mediaIds: number[]): MediaGroupSummaryDto[] {
	if (mediaIds.length === 0) {
		return [];
	}

	return getDatabase()
		.prepare<[ string ], UserGroupSummaryRow>(STMT)
		.all(JSON.stringify(mediaIds));
}
