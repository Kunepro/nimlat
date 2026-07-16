import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import {
	createGroupInspectionSummary,
	type GroupInspectionSummaryRow,
} from "../../group-inspection-summary-model";
import { preferredMediaTitleSql } from "../../utils/preferred-title-sql";

const PREFERRED_GROUP_BASE_TITLE_SQL = preferredMediaTitleSql(
	"baseMedia",
	"groups.name",
);

// noinspection SqlResolve
const STMT = sql`
    SELECT groups.id                                             AS groupId,
           COALESCE(userGroupOverrides.name, ${ PREFERRED_GROUP_BASE_TITLE_SQL }) AS groupName,
           CASE
               WHEN userGroupOverrides.description IS NOT NULL THEN userGroupOverrides.description
               ELSE groups.description
               END                                               AS groupDescription,
           groups.imageUrl                                       AS groupImageUrl,
           userAnimeGroupIntegrationSnapshots.integrationPercent AS groupIntegrationPercent,
           userAnimeGroupStates.integrationStatus                AS groupIntegrationStatus,
           COUNT(media.mediaId)                                  AS mediasCount,
           SUM(CASE
                   WHEN media.mediaId IS NOT NULL
                       AND COALESCE(userMediaWatchStates.isWatched, 0) = 1
                       THEN 1
                   ELSE 0
               END)                                              AS watchedMediasCount
    FROM anime_data.groups groups
             LEFT JOIN userGroupOverrides
                       ON userGroupOverrides.animeGroupId = groups.id
             LEFT JOIN userAnimeGroupStates
                       ON userAnimeGroupStates.animeGroupId = groups.id
             LEFT JOIN userAnimeGroupIntegrationSnapshots
                       ON userAnimeGroupIntegrationSnapshots.animeGroupId = groups.id
             LEFT JOIN anime_data.media baseMedia
                       ON baseMedia.mediaId = groups.baseMediaId
             LEFT JOIN anime_data.groupMedia groupMedia
                       ON groupMedia.groupId = groups.id
             LEFT JOIN anime_data.media media
                       ON media.mediaId = groupMedia.mediaId
                           AND media.isStub = 0
             LEFT JOIN userMediaWatchStates
                       ON userMediaWatchStates.mediaId = media.mediaId
    WHERE groups.id = ?
    GROUP BY groups.id,
             groups.name,
             groups.description,
             groups.imageUrl,
             baseMedia.name,
             baseMedia.nameRomanji,
             baseMedia.nameJapanese,
             userGroupOverrides.name,
             userGroupOverrides.description,
             userAnimeGroupIntegrationSnapshots.integrationPercent,
             userAnimeGroupStates.integrationStatus
`;

export function selectGroupInspectionSummaryById(groupId: number): GroupInspectionSummary | null {
	const row = getDatabase()
		.prepare(STMT)
		.get(groupId) as GroupInspectionSummaryRow | undefined;

	return createGroupInspectionSummary(row);
}
