import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type GroupLastRefreshAtRow = {
	lastRefreshAt: number | null;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT COALESCE(baseMedia.lastUpdatedAt, MAX(media.lastUpdatedAt)) AS lastRefreshAt
    FROM anime_data.groups groups
             LEFT JOIN anime_data.media baseMedia
                       ON baseMedia.mediaId = groups.baseMediaId
             LEFT JOIN anime_data.groupMedia groupMedia
                       ON groupMedia.groupId = groups.id
             LEFT JOIN anime_data.media media
                       ON media.mediaId = groupMedia.mediaId
    WHERE groups.id = ?
    GROUP BY groups.id, baseMedia.lastUpdatedAt
`;

/**
 * Resolve the freshest persisted timestamp associated with a Group's loaded Media data.
 */
export function selectGroupLastRefreshAtById(groupId: number): number | undefined {
	const row = getDatabase()
		.prepare(STMT)
		.get(groupId) as GroupLastRefreshAtRow | undefined;

	return typeof row?.lastRefreshAt === "number"
		? row.lastRefreshAt
		: undefined;
}
