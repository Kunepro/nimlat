import {
	AnimeDbReconcileSafetyDiagnosticsDto,
	UserGroupingDiagnosticsCountsDto,
	UserGroupingDiagnosticsDto,
	UserGroupingDiagnosticsIssueCountsDto,
	UserGroupingLatestReconcileRunDto,
} from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { inspectAttachedAnimeDbReconcileSafety } from "../../anime/metadata/validate-anime-db-reconcile-safety";
import { getUserGroupingState } from "./user-grouping-state";

type DiagnosticAggregateRow = UserGroupingDiagnosticsCountsDto & UserGroupingDiagnosticsIssueCountsDto;

type LatestReconcileRunRow = UserGroupingLatestReconcileRunDto;

// Keep labels deterministic so logs and smoke assertions report the same non-zero counters.
function buildIssueLabels(issueCounts: UserGroupingDiagnosticsIssueCountsDto): string[] {
	return Object.entries(issueCounts)
		.filter(([ , value ]) => value > 0)
		.map(([ key, value ]) => `${ key }=${ value }`);
}

// Normalize AnimeDB safety counters into the same diagnostic label contract.
function buildAnimeDbSafetyIssueLabels(diagnostics: AnimeDbReconcileSafetyDiagnosticsDto): string[] {
	const issueLabels: string[] = [];

	if (diagnostics.lineagesMissingBaseMediaRecordCount > 0) {
		issueLabels.push(`lineagesMissingBaseMediaRecordCount=${ diagnostics.lineagesMissingBaseMediaRecordCount }`);
	}
	if (diagnostics.lineagesMissingBaseMediaAniListIdCount > 0) {
		issueLabels.push(`lineagesMissingBaseMediaAniListIdCount=${ diagnostics.lineagesMissingBaseMediaAniListIdCount }`);
	}
	if (diagnostics.groupsMissingLineageCount > 0) {
		issueLabels.push(`groupsMissingLineageCount=${ diagnostics.groupsMissingLineageCount }`);
	}
	if (diagnostics.groupsMissingBaseMediaRecordCount > 0) {
		issueLabels.push(`groupsMissingBaseMediaRecordCount=${ diagnostics.groupsMissingBaseMediaRecordCount }`);
	}
	if (diagnostics.groupsMissingBaseMediaAniListIdCount > 0) {
		issueLabels.push(`groupsMissingBaseMediaAniListIdCount=${ diagnostics.groupsMissingBaseMediaAniListIdCount }`);
	}
	if (diagnostics.groupsWithBaseMediaMismatchCount > 0) {
		issueLabels.push(`groupsWithBaseMediaMismatchCount=${ diagnostics.groupsWithBaseMediaMismatchCount }`);
	}

	return issueLabels;
}

// Inspect the current grouping snapshot without mutating it. The report covers
// mode/version alignment, lineage and membership consistency, orphan/duplicate
// ownership, and reconcile bookkeeping drift; keeping these checks together lets
// smoke tests and diagnostics reason over one coherent snapshot.
export function inspectUserGroupingDiagnostics(): UserGroupingDiagnosticsDto {
	const db = getDatabase();
	const state = getUserGroupingState();

	const aggregateRow = db.prepare<
		[
			string,
			string,
				string | null,
				string | null,
				string | null,
				string | null,
				string | null,
				string | null,
		],
		DiagnosticAggregateRow
	>(`
        SELECT (SELECT COUNT(*) FROM userGroups)                                                               AS userGroupCount,
               (SELECT COUNT(*) FROM userGroupMedias)                                                          AS userGroupMediaLinkCount,
               (SELECT COUNT(DISTINCT mediaId) FROM userGroupMedias)                                           AS distinctMediaInUserGroupsCount,
               (SELECT COUNT(*) FROM userGroupLineages)                                                        AS lineageCount,
               (SELECT COUNT(*) FROM userGroupLineages WHERE status = 'active')                                AS activeLineageCount,
               (SELECT COUNT(*) FROM userGroupLineages WHERE status = 'deleted')                               AS deletedLineageCount,
               (SELECT COUNT(*) FROM userGroupLineages WHERE status = 'merged')                                AS mergedLineageCount,
               (SELECT COUNT(*)
                FROM userGroupLineages ugl
                         LEFT JOIN anime_data.groupLineages gl
                                   ON gl.groupLineageId = ugl.groupLineageId
                WHERE ugl.status = 'active'
                  AND gl.groupLineageId IS NULL)                                                               AS activeUserLineagesMissingCurrentAnimeLineageCount,
               (SELECT COUNT(*)
                FROM userGroupLineages ugl
                         LEFT JOIN anime_data.groups groups
                                   ON groups.groupLineageId = ugl.groupLineageId
                WHERE ugl.status = 'active'
                  AND groups.id IS NULL)                                                                       AS activeUserLineagesMissingCurrentAnimeGroupCount,
               (SELECT COUNT(*) FROM userGroupingReconcileRuns)                                                AS reconcileRunCount,
               (SELECT COUNT(*) FROM userGroupingReconcileConflicts WHERE resolutionStatus = 'pending')        AS pendingConflictCount,
               (SELECT COUNT(*) FROM userGroupingReconcileConflicts WHERE resolutionStatus = 'superseded')    AS supersededConflictCount,
               (SELECT COUNT(*)
                FROM userGroupingReconcileConflicts
                WHERE resolutionStatus NOT IN ('pending', 'superseded'))                                       AS otherConflictResolutionCount,
               CASE
                   WHEN ? = 'anime'
                       THEN ((SELECT COUNT(*) FROM userGroups)
                           + (SELECT COUNT(*) FROM userGroupMedias)
                           + (SELECT COUNT(*) FROM userGroupLineages))
                   ELSE 0
	               END                                                                                          AS snapshotResidueInAnimeModeCount,
               CASE
                   WHEN ? = 'user'
                       AND (? IS NULL OR TRIM(?) = '')
                       THEN 1
                   ELSE 0
	               END                                                                                          AS userModeMissingForkVersionCount,
               (SELECT COUNT(*) FROM userGroups WHERE groupLineageId IS NULL)                                  AS userGroupsMissingLineageIdCount,
               (SELECT COUNT(*)
                FROM userGroups groups
                WHERE NOT EXISTS(
                    SELECT 1
                    FROM userGroupMedias groupMedias
                    WHERE groupMedias.groupId = groups.id
                ))                                                                                             AS userGroupsWithoutMediaCount,
               (SELECT COUNT(*)
                FROM (SELECT mediaId
                      FROM userGroupMedias
                      GROUP BY mediaId
                      HAVING COUNT(*) > 1) duplicateMediaOwnership)                                            AS mediasWithMultipleUserGroupsCount,
               (SELECT COUNT(*)
                FROM userGroupLineages
                WHERE status = 'active'
                  AND userGroupId IS NULL)                                                                     AS activeLineagesMissingUserGroupCount,
               (SELECT COUNT(*)
                FROM userGroupLineages
                WHERE status IN ('deleted', 'merged')
                  AND userGroupId IS NOT NULL)                                                                 AS inactiveLineagesStillMappedCount,
               (SELECT COUNT(*)
                FROM userGroupStates groupStates
                         LEFT JOIN userGroupLineages lineages
                                   ON lineages.groupLineageId = groupStates.groupLineageId
                WHERE lineages.groupLineageId IS NULL)
               + (SELECT COUNT(*)
                  FROM userAnimeGroupStates animeGroupStates
                           LEFT JOIN anime_data.groups groups
                                     ON groups.id = animeGroupStates.animeGroupId
                  WHERE groups.id IS NULL)
               + (SELECT COUNT(*)
                  FROM userCustomGroupStates customGroupStates
                           LEFT JOIN userGroups groups
                                     ON groups.id = customGroupStates.userGroupId
                  WHERE groups.id IS NULL)                                                                     AS groupStatesWithoutLineageCount,
               (SELECT COUNT(*)
                FROM userGroupIntegrationSnapshots snapshots
                         LEFT JOIN userGroupLineages lineages
                                   ON lineages.groupLineageId = snapshots.groupLineageId
                WHERE lineages.groupLineageId IS NULL)
               + (SELECT COUNT(*)
                  FROM userAnimeGroupIntegrationSnapshots animeSnapshots
                           LEFT JOIN anime_data.groups groups
                                     ON groups.id = animeSnapshots.animeGroupId
                  WHERE groups.id IS NULL)
               + (SELECT COUNT(*)
                  FROM userCustomGroupIntegrationSnapshots customSnapshots
                           LEFT JOIN userGroups groups
                                     ON groups.id = customSnapshots.userGroupId
                  WHERE groups.id IS NULL)                                                                     AS groupIntegrationSnapshotsWithoutLineageCount,
               (SELECT COUNT(*)
                FROM userGroupingReconcileConflicts conflicts
                WHERE conflicts.resolutionStatus = 'pending'
                  AND conflicts.runId <> COALESCE(
                          (SELECT MAX(runs.id)
                           FROM userGroupingReconcileRuns runs),
                          -1
                      ))                                                                                       AS pendingConflictsFromNonLatestRunCount,
               CASE
                   WHEN ? IS NULL
                       THEN 0
                   WHEN (SELECT runs.toAnimeDbVersion
                         FROM userGroupingReconcileRuns runs
                         ORDER BY runs.id DESC
                         LIMIT 1) IS NULL
                       THEN 1
                   WHEN ? <> (SELECT runs.toAnimeDbVersion
                              FROM userGroupingReconcileRuns runs
                              ORDER BY runs.id DESC
                              LIMIT 1)
                       THEN 1
                   ELSE 0
	               END                                                                                          AS lastReconcileVersionMismatchCount,
               CASE
                   WHEN ? IS NULL
                       THEN 0
                   WHEN (SELECT runs.status
                         FROM userGroupingReconcileRuns runs
                         ORDER BY runs.id DESC
                         LIMIT 1) IS NULL
                       THEN 1
                   WHEN ? <> (SELECT runs.status
                              FROM userGroupingReconcileRuns runs
                              ORDER BY runs.id DESC
                              LIMIT 1)
                       THEN 1
                   ELSE 0
	               END                                                                                          AS lastReconcileStatusMismatchCount
	`).get(
		state.groupingMode,
		state.groupingMode,
		state.forkedFromAnimeDbVersion ?? null,
		state.forkedFromAnimeDbVersion ?? null,
		state.lastReconciledAnimeDbVersion ?? null,
		state.lastReconciledAnimeDbVersion ?? null,
		state.lastReconcileStatus ?? null,
		state.lastReconcileStatus ?? null,
	);

	const latestReconcileRun = db.prepare<[], LatestReconcileRunRow>(`
        SELECT id,
               fromAnimeDbVersion,
               toAnimeDbVersion,
               startedAt,
               completedAt,
               status,
               summaryJson
        FROM userGroupingReconcileRuns
        ORDER BY id DESC
        LIMIT 1
	`).get() ?? null;

	const counts: UserGroupingDiagnosticsCountsDto = {
		userGroupCount:                                  Number(aggregateRow?.userGroupCount ?? 0),
		userGroupMediaLinkCount:                         Number(aggregateRow?.userGroupMediaLinkCount ?? 0),
		distinctMediaInUserGroupsCount:                  Number(aggregateRow?.distinctMediaInUserGroupsCount ?? 0),
		lineageCount:                                    Number(aggregateRow?.lineageCount ?? 0),
		activeLineageCount:                              Number(aggregateRow?.activeLineageCount ?? 0),
		deletedLineageCount:                             Number(aggregateRow?.deletedLineageCount ?? 0),
		mergedLineageCount:                              Number(aggregateRow?.mergedLineageCount ?? 0),
		activeUserLineagesMissingCurrentAnimeLineageCount: Number(
			aggregateRow?.activeUserLineagesMissingCurrentAnimeLineageCount ?? 0,
		),
		activeUserLineagesMissingCurrentAnimeGroupCount: Number(
			aggregateRow?.activeUserLineagesMissingCurrentAnimeGroupCount ?? 0,
		),
		reconcileRunCount:                               Number(aggregateRow?.reconcileRunCount ?? 0),
		pendingConflictCount:                            Number(aggregateRow?.pendingConflictCount ?? 0),
		supersededConflictCount:                         Number(aggregateRow?.supersededConflictCount ?? 0),
		otherConflictResolutionCount:                    Number(aggregateRow?.otherConflictResolutionCount ?? 0),
	};

	const issueCounts: UserGroupingDiagnosticsIssueCountsDto = {
		snapshotResidueInAnimeModeCount:       Number(aggregateRow?.snapshotResidueInAnimeModeCount ?? 0),
		userModeMissingForkVersionCount:       Number(aggregateRow?.userModeMissingForkVersionCount ?? 0),
		userGroupsMissingLineageIdCount:       Number(aggregateRow?.userGroupsMissingLineageIdCount ?? 0),
		userGroupsWithoutMediaCount:           Number(aggregateRow?.userGroupsWithoutMediaCount ?? 0),
		mediasWithMultipleUserGroupsCount:     Number(aggregateRow?.mediasWithMultipleUserGroupsCount ?? 0),
		activeLineagesMissingUserGroupCount:   Number(aggregateRow?.activeLineagesMissingUserGroupCount ?? 0),
		inactiveLineagesStillMappedCount:      Number(aggregateRow?.inactiveLineagesStillMappedCount ?? 0),
		groupStatesWithoutLineageCount:        Number(aggregateRow?.groupStatesWithoutLineageCount ?? 0),
		groupIntegrationSnapshotsWithoutLineageCount: Number(aggregateRow?.groupIntegrationSnapshotsWithoutLineageCount ?? 0),
		pendingConflictsFromNonLatestRunCount: Number(aggregateRow?.pendingConflictsFromNonLatestRunCount ?? 0),
		lastReconcileVersionMismatchCount:     Number(aggregateRow?.lastReconcileVersionMismatchCount ?? 0),
		lastReconcileStatusMismatchCount:      Number(aggregateRow?.lastReconcileStatusMismatchCount ?? 0),
	};

	const animeDbReconcileSafety = inspectAttachedAnimeDbReconcileSafety();
	const issueLabels                                        = [
		...buildIssueLabels(issueCounts),
		...buildAnimeDbSafetyIssueLabels(animeDbReconcileSafety),
	];

	return {
		state,
		counts,
		issueCounts,
		issueLabels,
		hasIssues: issueLabels.length > 0,
		latestReconcileRun,
		animeDbReconcileSafety,
	};
}
