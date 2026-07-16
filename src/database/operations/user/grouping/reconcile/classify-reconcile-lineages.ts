import type { ReconcileLineageItem } from "@nimlat/types/anime-db-reconcile";
import type { Database } from "better-sqlite3";
import {
	type LineageMetaRow,
	type MissingUpstreamGroupRow,
	type MissingUpstreamLineageRow,
} from "./classify-reconcile-lineage-types";
import {
	classifyMissingUpstreamGroupRow,
	classifyMissingUpstreamLineageRow,
	classifyReconcileLineageMetaRow,
} from "./classify-reconcile-row";

// Classify every concrete upstream anime_data group against the current user
// grouping snapshot. This is a pure read operation; persistence happens in the
// reconcile run tables owned by the caller.
export function classifyReconcileLineages(db: Database): ReconcileLineageItem[] {
	// noinspection SqlResolve
	const rows = db.prepare<[], LineageMetaRow>(`
        SELECT gl.groupLineageId,
               gl.baseMediaId                                              AS animeBaseMediaId,
               g.id                                                        AS animeGroupId,
               g.name                                                      AS animeGroupName,
               CASE WHEN ugl.groupLineageId IS NOT NULL THEN 1 ELSE 0 END AS knownInUser,
               ugl.userGroupId,
               ugl.status                                                  AS userLineageStatus,
               ugl.lastUserModifiedAt,
               ug.isUserCreated,
               collisionGroup.id                                           AS collisionUserGroupId,
               collisionGroup.isUserCreated                                AS collisionIsUserCreated
        FROM anime_data.groups g
                 JOIN anime_data.groupLineages gl ON gl.groupLineageId = g.groupLineageId
                 LEFT JOIN userGroupLineages ugl ON ugl.groupLineageId = gl.groupLineageId
                 LEFT JOIN userGroups ug ON ug.id = ugl.userGroupId
                 LEFT JOIN userGroups collisionGroup
                           ON ugl.groupLineageId IS NULL
                               AND collisionGroup.id = (
                                   SELECT MIN(candidate.id)
                                   FROM userGroups candidate
                                   WHERE candidate.groupLineageId = gl.groupLineageId
                               )
        ORDER BY gl.groupLineageId
	`).all();

	const upstreamItems = rows.map(row => {
		const {
						classification,
						userGroupId,
						newMediaIds,
						conflictReason,
						conflictAutoApplyBehavior,
						conflictRecommendedAction,
					} = classifyReconcileLineageMetaRow(
			row,
			db,
		);

		return {
			groupLineageId: row.groupLineageId,
			classification,
			animeGroupId:   row.animeGroupId,
			animeGroupName: row.animeGroupName,
			animeBaseMediaId: row.animeBaseMediaId,
			userGroupId,
			newMediaIds,
			conflictReason,
			conflictAutoApplyBehavior,
			conflictRecommendedAction,
		};
	});

	// Active user-owned official lineages that disappeared from the refreshed anime DB entirely.
	// These would be invisible to the upstream-first query above, so we classify them separately.
	const missingUpstreamGroupRows = db.prepare<[], MissingUpstreamGroupRow>(`
        SELECT ugl.groupLineageId,
               COALESCE(gl.baseMediaId, ug.baseMediaId, ugl.groupLineageId) AS bestKnownBaseMediaId,
               ugl.userGroupId
        FROM userGroupLineages ugl
                 LEFT JOIN anime_data.groupLineages gl ON gl.groupLineageId = ugl.groupLineageId
                 LEFT JOIN anime_data.groups g ON g.groupLineageId = ugl.groupLineageId
                 LEFT JOIN userGroups ug ON ug.id = ugl.userGroupId
        WHERE gl.groupLineageId IS NOT NULL
          AND g.id IS NULL
          AND ugl.status = 'active'
        ORDER BY ugl.groupLineageId
	`).all();
	const missingUpstreamRows = db.prepare<[], MissingUpstreamLineageRow>(`
        SELECT ugl.groupLineageId,
               COALESCE(ug.baseMediaId, ugl.groupLineageId) AS bestKnownBaseMediaId,
               ugl.userGroupId
        FROM userGroupLineages ugl
                 LEFT JOIN userGroups ug ON ug.id = ugl.userGroupId
                 LEFT JOIN anime_data.groupLineages gl ON gl.groupLineageId = ugl.groupLineageId
        WHERE gl.groupLineageId IS NULL
          AND ugl.status = 'active'
        ORDER BY ugl.groupLineageId
	`).all();

	return [
		...upstreamItems,
		...missingUpstreamGroupRows.map(classifyMissingUpstreamGroupRow),
		...missingUpstreamRows.map(classifyMissingUpstreamLineageRow),
	].sort((left, right) => left.groupLineageId - right.groupLineageId);
}
