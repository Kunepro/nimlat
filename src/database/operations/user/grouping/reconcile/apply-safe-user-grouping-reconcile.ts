import type { Database } from "better-sqlite3";
import type {
	GroupingMutationImpactDto,
	ReconcileApplyExecutionResult,
	ReconcileApplySummary,
	UserGroupingStateDto,
} from "../../../../../shared/types/anime-db";
import { getDatabase } from "../../../../utils/get-db";
import { repairAndAssertAttachedAnimeDbReconcileSafety } from "../../../anime/metadata/validate-anime-db-reconcile-safety";
import { assignMediasToUserGroupInternal } from "../assign-medias-to-user-group";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "../log-grouping-diagnostics-if-debugging-enabled";
import { getUserGroupingState } from "../user-grouping-state";
import { classifyReconcileLineages } from "./classify-reconcile-lineages";
import { importAnimeGroupLineageIntoUserSnapshotInternal } from "./import-anime-group-lineage-into-user-snapshot";
import { runAndPersistReconcilePreflight } from "./reconcile-run-operations";

// Persist the singleton grouping reconcile state inside an existing DB transaction.
// The public operation owns orchestration and error state; this helper keeps
// the apply flow atomic.
function saveUserGroupingReconcileStateInternal(db: Database, state: UserGroupingStateDto): void {
	// noinspection SqlResolve
	db.prepare<[
		1,
		string,
			string | null,
			string | null,
			number | null,
			string | null,
			string | null,
	]>(`
        INSERT INTO userGroupingState (id,
                                       groupingMode,
                                       forkedFromAnimeDbVersion,
                                       lastReconciledAnimeDbVersion,
                                       lastReconciledAt,
                                       lastReconcileStatus,
                                       lastReconcileSummaryJson)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id)
            DO UPDATE SET groupingMode                 = excluded.groupingMode,
                          forkedFromAnimeDbVersion     = excluded.forkedFromAnimeDbVersion,
                          lastReconciledAnimeDbVersion = excluded.lastReconciledAnimeDbVersion,
                          lastReconciledAt             = excluded.lastReconciledAt,
                          lastReconcileStatus          = excluded.lastReconcileStatus,
                          lastReconcileSummaryJson     = excluded.lastReconcileSummaryJson
	`).run(
		1,
		state.groupingMode,
		state.forkedFromAnimeDbVersion ?? null,
		state.lastReconciledAnimeDbVersion ?? null,
		state.lastReconciledAt ?? null,
		state.lastReconcileStatus ?? null,
		state.lastReconcileSummaryJson ?? null,
	);
}

// Update one existing lineage row after a preflight/apply pass has seen the upstream lineage.
//
// Safe apply only changes `lastAutoImportedAt` for lineages that actually imported new medias.
// Other seen lineages keep their prior import timestamp but still advance `lastSeenAnimeDbVersion`.
function markLineageSeenInternal(
	db: Database,
	groupLineageId: number,
	toAnimeDbVersion: string,
	now: number,
	didAutoImport: boolean,
): void {
	// noinspection SqlResolve
	db.prepare<[ string, number | null, number ]>(`
        UPDATE userGroupLineages
        SET lastSeenAnimeDbVersion = ?,
            lastAutoImportedAt     = COALESCE(?, lastAutoImportedAt)
        WHERE groupLineageId = ?
	`).run(
		toAnimeDbVersion,
		didAutoImport ? now : null,
		groupLineageId,
	);
}

function normalizeRequiredReconcileTargetVersion(toAnimeDbVersion: string): string {
	const normalizedVersion = toAnimeDbVersion.trim();
	if (normalizedVersion.length === 0) {
		throw new Error("Reconcile apply requires a configured anime DB version.");
	}

	return normalizedVersion;
}

function assertUserGroupingMode(): void {
	if (getUserGroupingState().groupingMode !== "user") {
		throw new Error("Reconcile apply requires user grouping mode.");
	}
}

// Run the persisted preflight classification and immediately apply only the Phase 19 safe imports.
//
// Safe rules:
// - import `new_group`
// - import medias for `new_media_in_clean_lineage`
// - mark `clean_lineage` and `user_deleted_lineage` as seen upstream
// - leave `conflict` rows untouched for manual follow-up
export function applySafeUserGroupingReconcile(params: {
	fromAnimeDbVersion: string | null;
	toAnimeDbVersion: string;
}): ReconcileApplyExecutionResult {
	assertUserGroupingMode();
	const toAnimeDbVersion = normalizeRequiredReconcileTargetVersion(params.toAnimeDbVersion);
	repairAndAssertAttachedAnimeDbReconcileSafety();

	const db = getDatabase();
	let failedRunId: number | null = null;

	try {
		const preflight = runAndPersistReconcilePreflight({
			fromAnimeDbVersion: params.fromAnimeDbVersion,
			toAnimeDbVersion,
			readClassifiedLineages: classifyReconcileLineages,
		});
		failedRunId     = preflight.runId;

		const result = db.transaction(() => {
			const now                                 = Date.now();
			const affectedGroupIds                    = new Set<number>();
			const affectedMediaIds                    = new Set<number>();
			const applySummary: ReconcileApplySummary = {
				newGroupsImported:          0,
				existingLineagesUpdatedWithNewMedias: 0,
				importedMediaCount:         0,
				cleanLineagesMarkedSeen:    0,
				userDeletedLineagesSkipped: 0,
				conflictsSkipped:           0,
			};

			for (const item of preflight.items) {
				switch (item.classification) {
					case "new_group": {
						const importedGroup = importAnimeGroupLineageIntoUserSnapshotInternal(
							db,
							{
								groupLineageId: item.groupLineageId,
								toAnimeDbVersion,
								now,
							},
						);
						applySummary.newGroupsImported++;
						applySummary.importedMediaCount += importedGroup.importedMediaIds.length;
						affectedGroupIds.add(importedGroup.groupId);
						for (const mediaId of importedGroup.importedMediaIds) {
							affectedMediaIds.add(mediaId);
						}
						break;
					}
					case "new_media_in_clean_lineage": {
						if (item.userGroupId == null) {
							throw new Error(`Cannot import medias for lineage ${ item.groupLineageId } because no user group is mapped.`);
						}
						assignMediasToUserGroupInternal(
							db,
							item.userGroupId,
							item.newMediaIds,
						);
						markLineageSeenInternal(
							db,
							item.groupLineageId,
							toAnimeDbVersion,
							now,
							true,
						);
						applySummary.existingLineagesUpdatedWithNewMedias++;
						applySummary.importedMediaCount += item.newMediaIds.length;
						affectedGroupIds.add(item.userGroupId);
						for (const mediaId of item.newMediaIds) {
							affectedMediaIds.add(mediaId);
						}
						break;
					}
					case "clean_lineage":
						applySummary.cleanLineagesMarkedSeen++;
						markLineageSeenInternal(
							db,
							item.groupLineageId,
							toAnimeDbVersion,
							now,
							false,
						);
						break;
					case "user_deleted_lineage":
						applySummary.userDeletedLineagesSkipped++;
						markLineageSeenInternal(
							db,
							item.groupLineageId,
							toAnimeDbVersion,
							now,
							false,
						);
						break;
					case "conflict":
						applySummary.conflictsSkipped++;
						if (item.conflictReason !== "upstream_lineage_removed") {
							markLineageSeenInternal(
								db,
								item.groupLineageId,
								toAnimeDbVersion,
								now,
								false,
							);
						}
						break;
				}
			}

			const report = {
				runId:              preflight.runId,
				fromAnimeDbVersion: params.fromAnimeDbVersion,
				toAnimeDbVersion,
				startedAt:          preflight.startedAt,
				preflightCompletedAt: preflight.completedAt,
				appliedAt:          now,
				preflightSummary:   preflight.summary,
				applySummary,
			};

			saveUserGroupingReconcileStateInternal(
				db,
				{
					id:                       1,
					groupingMode:             "user",
					forkedFromAnimeDbVersion: params.fromAnimeDbVersion,
					lastReconciledAnimeDbVersion: toAnimeDbVersion,
					lastReconciledAt:         now,
					lastReconcileStatus:      "completed",
					lastReconcileSummaryJson: JSON.stringify({
						runId: preflight.runId,
						preflightSummary: preflight.summary,
						applySummary,
					}),
				},
			);

			return {
				report,
				impact: {
									affectedMediaIds: [ ...affectedMediaIds ],
									affectedGroupIds: [ ...affectedGroupIds ],
								} satisfies GroupingMutationImpactDto,
			};
		})();
		logGroupingDiagnosticsIfDebuggingEnabled("groupingReconcile.applySafeImport");

		return result;
	} catch (error) {
		const failedAt = Date.now();
		saveUserGroupingReconcileStateInternal(
			db,
			{
				id:                       1,
				groupingMode:             "user",
				forkedFromAnimeDbVersion: params.fromAnimeDbVersion,
				lastReconciledAnimeDbVersion: toAnimeDbVersion,
				lastReconciledAt:         failedAt,
				lastReconcileStatus:      "failed",
				lastReconcileSummaryJson: JSON.stringify({
					runId: failedRunId,
					error: String(error),
				}),
			},
		);
		throw error;
	}
}
