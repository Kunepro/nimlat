import { normalizeIntegrationStatus } from "@nimlat/constants/integration-status";
import { createSearchKey } from "@nimlat/functions";
import { IntegrationStatus } from "@nimlat/types/anime-db";
import { GroupExplorerCardsPage } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";

type GroupExplorerCardRow = {
	id: number;
	name: string;
	description: string | null;
	baseMediaId: number | null;
	groupLineageId: number | null;
	imageUrl: string | null;
	integrationPercent: number | null;
	integrationStatus: IntegrationStatus | null;
	lastRefreshAt: number | null;
};

const PREFERRED_GROUP_BASE_TITLE_SQL = preferredMediaTitleSql(
	"baseMedia",
	"groups.name",
);

// noinspection SqlResolve
const STMT_PAGE = sql`
    WITH groupCards AS (SELECT groups.id,
                               COALESCE(userGroupOverrides.name, ${ PREFERRED_GROUP_BASE_TITLE_SQL }) AS name,
                               CASE
                                   WHEN userGroupOverrides.description IS NOT NULL THEN userGroupOverrides.description
                                   ELSE groups.description
                                   END                                                     AS description,
                               groups.imageUrl AS imageUrl,
                               groups.baseMediaId,
                               groups.groupLineageId,
                               COALESCE(baseMedia.lastUpdatedAt, MAX(media.lastUpdatedAt)) AS lastRefreshAt
                        FROM anime_data.groups groups
                                 LEFT JOIN userGroupOverrides
                                           ON userGroupOverrides.animeGroupId = groups.id
                                 LEFT JOIN anime_data.media baseMedia
                                           ON baseMedia.mediaId = groups.baseMediaId
                                 LEFT JOIN anime_data.groupMedia groupMedia
                                           ON groupMedia.groupId = groups.id
                                 LEFT JOIN anime_data.media media
                                           ON media.mediaId = groupMedia.mediaId
                        WHERE (? = '' OR (COALESCE(userGroupOverrides.nameSearchKey, groups.nameSearchKey, '')
                            || ' ' || COALESCE(baseMedia.nameSearchKey, '')) LIKE ?)
                        GROUP BY groups.id,
                                 groups.name,
                                 groups.description,
                                 groups.baseMediaId,
                                 groups.groupLineageId,
                                 groups.imageUrl,
                                 userGroupOverrides.name,
                                 userGroupOverrides.description,
                                 baseMedia.name,
                                 baseMedia.nameRomanji,
                                 baseMedia.nameJapanese,
                                 baseMedia.lastUpdatedAt)
    SELECT groupCards.id,
           groupCards.name,
           groupCards.description,
           groupCards.baseMediaId,
           groupCards.groupLineageId,
           groupCards.imageUrl,
           userAnimeGroupIntegrationSnapshots.integrationPercent AS integrationPercent,
           userAnimeGroupStates.integrationStatus                AS integrationStatus,
           groupCards.lastRefreshAt
    FROM groupCards
             LEFT JOIN userAnimeGroupIntegrationSnapshots
                       ON userAnimeGroupIntegrationSnapshots.animeGroupId = groupCards.id
             LEFT JOIN userAnimeGroupStates
                       ON userAnimeGroupStates.animeGroupId = groupCards.id
    ORDER BY groupCards.name COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
`;

// noinspection SqlResolve
const STMT_COUNT = sql`
    SELECT COUNT(*) as total
    FROM anime_data.groups groups
             LEFT JOIN userGroupOverrides
                       ON userGroupOverrides.animeGroupId = groups.id
             LEFT JOIN anime_data.media baseMedia
                       ON baseMedia.mediaId = groups.baseMediaId
    WHERE (? = '' OR (COALESCE(userGroupOverrides.nameSearchKey, groups.nameSearchKey, '')
        || ' ' || COALESCE(baseMedia.nameSearchKey, '')) LIKE ?)
`;

export function selectGroupExplorerCardsPage(offset: number, limit: number, search: string): GroupExplorerCardsPage {
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
		) as GroupExplorerCardRow[];

	const cards      = rows.map((row) => ({
		id:                 row.id,
		name:               row.name,
		description:        row.description ?? undefined,
		baseMediaId:        row.baseMediaId ?? undefined,
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
