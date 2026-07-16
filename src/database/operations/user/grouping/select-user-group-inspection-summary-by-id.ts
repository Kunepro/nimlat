import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import {
	createGroupInspectionSummary,
	type GroupInspectionSummaryRow,
} from "../../group-inspection-summary-model";

// noinspection SqlResolve
const STMT = sql`
    SELECT userGroups.id                                          AS groupId,
           userGroups.name                                        AS groupName,
           userGroups.description                                 AS groupDescription,
           userGroups.imageUrl                                    AS groupImageUrl,
           userCustomGroupIntegrationSnapshots.integrationPercent AS groupIntegrationPercent,
           userCustomGroupStates.integrationStatus                AS groupIntegrationStatus,
           COUNT(media.mediaId)                                   AS mediasCount,
           SUM(CASE
                   WHEN media.mediaId IS NOT NULL
                       AND COALESCE(userMediaWatchStates.isWatched, 0) = 1
                       THEN 1
                   ELSE 0
               END)                                               AS watchedMediasCount
    FROM userGroups
             LEFT JOIN userCustomGroupStates
                       ON userCustomGroupStates.userGroupId = userGroups.id
             LEFT JOIN userCustomGroupIntegrationSnapshots
                       ON userCustomGroupIntegrationSnapshots.userGroupId = userGroups.id
             LEFT JOIN userGroupMedias
                       ON userGroupMedias.groupId = userGroups.id
             LEFT JOIN anime_data.media media
                       ON media.mediaId = userGroupMedias.mediaId
                           AND media.isStub = 0
             LEFT JOIN userMediaWatchStates
                       ON userMediaWatchStates.mediaId = media.mediaId
    WHERE userGroups.id = ?
    GROUP BY userGroups.id,
             userGroups.name,
             userGroups.description,
             userGroups.imageUrl,
             userCustomGroupIntegrationSnapshots.integrationPercent,
             userCustomGroupStates.integrationStatus
`;

export function selectUserGroupInspectionSummaryById(groupId: number): GroupInspectionSummary | null {
	const row = getDatabase()
		.prepare(STMT)
		.get(groupId) as GroupInspectionSummaryRow | undefined;

	return createGroupInspectionSummary(row);
}
