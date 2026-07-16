import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import { createSearchKey } from "@nimlat/functions";
import { IntegrationStatus } from "@nimlat/types/anime-db";
import { GroupExplorerCardsPage } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type UserGroupExplorerCardRow = {
	id: number;
	name: string;
	description: string | null;
	baseMediaId: number;
	imageUrl: string | null;
	integrationPercent: number | null;
	integrationStatus: IntegrationStatus | null;
	lastRefreshAt: number | null;
};

// noinspection SqlResolve
const STMT_PAGE = sql`
    WITH groupCards AS (SELECT userGroups.id,
                               userGroups.name,
                               userGroups.description,
                               userGroups.baseMediaId AS baseMediaId,
                               userGroups.imageUrl,
                               userGroups.groupLineageId,
                               COALESCE(baseMedia.lastUpdatedAt, MAX(media.lastUpdatedAt)) AS lastRefreshAt
                        FROM userGroups
                                 LEFT JOIN anime_data.media baseMedia
                                           ON baseMedia.mediaId = userGroups.baseMediaId
                                 LEFT JOIN userGroupMedias
                                           ON userGroupMedias.groupId = userGroups.id
                                 LEFT JOIN anime_data.media media
                                           ON media.mediaId = userGroupMedias.mediaId
                        WHERE (? = '' OR userGroups.nameSearchKey LIKE ?)
                        GROUP BY userGroups.id,
                                 userGroups.name,
                                 userGroups.description,
                                 userGroups.baseMediaId,
                                 userGroups.imageUrl,
                                 userGroups.groupLineageId,
                                 baseMedia.lastUpdatedAt)
    SELECT groupCards.id,
           groupCards.name,
           groupCards.description,
           groupCards.baseMediaId,
           groupCards.imageUrl,
           userCustomGroupIntegrationSnapshots.integrationPercent AS integrationPercent,
           userCustomGroupStates.integrationStatus                AS integrationStatus,
           groupCards.lastRefreshAt
    FROM groupCards
             LEFT JOIN userCustomGroupIntegrationSnapshots
                       ON userCustomGroupIntegrationSnapshots.userGroupId = groupCards.id
             LEFT JOIN userCustomGroupStates
                       ON userCustomGroupStates.userGroupId = groupCards.id
    ORDER BY groupCards.name COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
`;

// noinspection SqlResolve
const STMT_COUNT = sql`
    SELECT COUNT(*) AS total
    FROM userGroups
    WHERE (? = '' OR nameSearchKey LIKE ?)
`;

// Read explorer cards from the forked user-owned grouping snapshot.
export function selectUserGroupExplorerCardsPage(offset: number, limit: number, search: string): GroupExplorerCardsPage {
	const normalizedSearch = createSearchKey(search);
	const likePattern      = `%${ normalizedSearch }%`;
	const total            = (getDatabase()
		.prepare(STMT_COUNT)
		.get(
			normalizedSearch,
			likePattern,
		) as { total: number }).total;
	const rows             = getDatabase()
		.prepare(STMT_PAGE)
		.all(
			normalizedSearch,
			likePattern,
			limit,
			offset,
		) as UserGroupExplorerCardRow[];

	const cards      = rows.map((row) => ({
		id:                 row.id,
		name:               row.name,
		description:        row.description ?? undefined,
		baseMediaId:        row.baseMediaId,
		imageUrl:           row.imageUrl ?? undefined,
		integrationPercent: row.integrationPercent ?? undefined,
		integrationStatus:  normalizeIntegrationStatus(row.integrationStatus) ?? undefined,
		lastRefresh:        row.lastRefreshAt
													? new Date(row.lastRefreshAt).toISOString()
													: new Date(0).toISOString(),
	}));
	const nextOffset = offset + cards.length < total ? offset + cards.length : null;

	return {
		cards,
		nextOffset,
		total,
	};
}
