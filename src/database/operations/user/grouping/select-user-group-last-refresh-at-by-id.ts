import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type UserGroupLastRefreshAtRow = {
	lastRefreshAt: number | null;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT COALESCE(baseMedia.lastUpdatedAt, MAX(media.lastUpdatedAt)) AS lastRefreshAt
    FROM userGroups
             LEFT JOIN anime_data.media baseMedia
                       ON baseMedia.mediaId = userGroups.baseMediaId
             LEFT JOIN userGroupMedias
                       ON userGroupMedias.groupId = userGroups.id
             LEFT JOIN anime_data.media media
                       ON media.mediaId = userGroupMedias.mediaId
    WHERE userGroups.id = ?
    GROUP BY userGroups.id, baseMedia.lastUpdatedAt
`;

/**
 * Resolve the freshest persisted timestamp associated with one user-owned Group row.
 */
export function selectUserGroupLastRefreshAtById(groupId: number): number | undefined {
	const row = getDatabase()
		.prepare(STMT)
		.get(groupId) as UserGroupLastRefreshAtRow | undefined;

	return typeof row?.lastRefreshAt === "number"
		? row.lastRefreshAt
		: undefined;
}

