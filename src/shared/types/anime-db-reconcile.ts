import type {
	GroupingMutationImpactDto,
	UserGroupingStateDto,
} from "./anime-db-user-state";

// Reconcile DTOs describe the bounded public contract for safe user-grouping
// updates after AnimeDB changes. Full DB detail stays in main/DB storage; renderer
// payloads should remain summaries or explicit review rows.
export type ReconcileLineageClass =
	| "new_group"
	| "new_media_in_clean_lineage"
	| "clean_lineage"
	| "user_deleted_lineage"
	| "conflict";

export type ReconcileRunStatus = "running" | "completed" | "failed";

// Why a lineage has been classified as a conflict.
// Stored in userGroupingReconcileConflicts.conflictType.
export type ReconcileConflictReason =
	| "lineage_merged"            // user merged this lineage into another group
	| "lineage_ownership_changed" // lastUserModifiedAt is set (structural change)
	| "lineage_identity_collision" // incoming official lineage collides with a different current user-owned group
	| "user_created_group"        // lineage is owned by a purely user-created group
	| "upstream_group_missing"    // upstream lineage has no concrete anime_data.groups row to import
	| "upstream_lineage_removed"  // user snapshot still references an official lineage no longer present upstream
	| "upstream_media_removed"    // user snapshot still references one or more upstream medias no longer present upstream
	| "lineage_membership_reshaped" // upstream and user memberships diverged on both sides (split/collapse/reshape)
	| "lineage_membership_drift"; // current user/upstream membership sets no longer match safely

// How the current safe reconcile stage treats one persisted conflict row.
// These values are intentionally UI-friendly and future manual-resolution flows can reuse them.
export type ReconcileConflictAutoApplyBehavior = "skip_warn" | "skip_blocking";

// Recommended next action for one reconcile conflict.
// This is guidance for future review tools, not an automatically executed command.
export type ReconcileConflictRecommendedAction =
	| "review_and_keep_current_grouping"
	| "review_and_restore_lineage"
	| "review_and_reassign_lineage"
	| "review_upstream_grouping_change";

export interface ReconcileConflictHandlingGuidance {
	autoApplyBehavior: ReconcileConflictAutoApplyBehavior;
	recommendedAction: ReconcileConflictRecommendedAction;
}

// Structured payload stored in `userGroupingReconcileConflicts.payloadJson`.
// The DB row keeps the raw reason in `conflictType`; this payload adds enough outcome metadata
// for future review UIs without requiring hard-coded mapping tables in the renderer.
export interface ReconcileConflictRecordPayload extends ReconcileConflictHandlingGuidance {
	animeGroupId: number | null;
	animeGroupName: string | null;
	animeBaseMediaId: number;
	conflictReason: ReconcileConflictReason;
}

export interface ReconcileLineageItem {
	groupLineageId: number;
	classification: ReconcileLineageClass;
	// anime_data.groups.id - null when the anime DB has no concrete group for this lineage.
	animeGroupId: number | null;
	animeGroupName: string | null;
	animeBaseMediaId: number;
	// userGroupLineages.userGroupId for this lineage.
	userGroupId: number | null;
	// mediaIds in anime_data but absent from user snapshot. Only set for new_media_in_clean_lineage.
	newMediaIds: number[];
	// Populated when classification === "conflict".
	conflictReason: ReconcileConflictReason | null;
	// Populated when classification === "conflict".
	conflictAutoApplyBehavior: ReconcileConflictAutoApplyBehavior | null;
	// Populated when classification === "conflict".
	conflictRecommendedAction: ReconcileConflictRecommendedAction | null;
}

export interface ReconcilePreflightSummary {
	newGroups: number;
	newMediaInCleanLineages: number;
	cleanLineages: number;
	userDeletedLineages: number;
	conflicts: number;
	// Total media items that would be auto-imported if Phase 19 safe-import runs.
	totalNewMediaCount: number;
}

// Structural diagnostics for whether the attached or downloaded anime DB is safe to use
// as reconcile input.
export interface AnimeDbReconcileSafetyDiagnosticsDto {
	groupLineageCount: number;
	officialGroupCount: number;
	lineagesMissingBaseMediaRecordCount: number;
	lineagesMissingBaseMediaAniListIdCount: number;
	groupsMissingLineageCount: number;
	groupsMissingBaseMediaRecordCount: number;
	groupsMissingBaseMediaAniListIdCount: number;
	groupsWithBaseMediaMismatchCount: number;
}

// Aggregate counts that describe the current shape of the forked user grouping snapshot.
export interface UserGroupingDiagnosticsCountsDto {
	userGroupCount: number;
	userGroupMediaLinkCount: number;
	distinctMediaInUserGroupsCount: number;
	lineageCount: number;
	activeLineageCount: number;
	deletedLineageCount: number;
	mergedLineageCount: number;
	activeUserLineagesMissingCurrentAnimeLineageCount: number;
	activeUserLineagesMissingCurrentAnimeGroupCount: number;
	reconcileRunCount: number;
	pendingConflictCount: number;
	supersededConflictCount: number;
	otherConflictResolutionCount: number;
}

// Strong consistency checks that should normally stay at zero.
// Non-zero values indicate stale snapshot state or grouping corruption worth debugging.
export interface UserGroupingDiagnosticsIssueCountsDto {
	snapshotResidueInAnimeModeCount: number;
	userModeMissingForkVersionCount: number;
	userGroupsMissingLineageIdCount: number;
	userGroupsWithoutMediaCount: number;
	mediasWithMultipleUserGroupsCount: number;
	activeLineagesMissingUserGroupCount: number;
	inactiveLineagesStillMappedCount: number;
	groupStatesWithoutLineageCount: number;
	groupIntegrationSnapshotsWithoutLineageCount: number;
	pendingConflictsFromNonLatestRunCount: number;
	lastReconcileVersionMismatchCount: number;
	lastReconcileStatusMismatchCount: number;
}

// Minimal metadata for the latest persisted reconcile run.
export interface UserGroupingLatestReconcileRunDto {
	id: number;
	fromAnimeDbVersion: string | null;
	toAnimeDbVersion: string;
	startedAt: number;
	completedAt: number | null;
	status: string;
	summaryJson: string | null;
}

// Main-process diagnostics report for grouping state, lineage consistency, orphan handling,
// and the latest known reconcile outcome.
export interface UserGroupingDiagnosticsDto {
	state: UserGroupingStateDto;
	counts: UserGroupingDiagnosticsCountsDto;
	issueCounts: UserGroupingDiagnosticsIssueCountsDto;
	issueLabels: string[];
	hasIssues: boolean;
	latestReconcileRun: UserGroupingLatestReconcileRunDto | null;
	animeDbReconcileSafety: AnimeDbReconcileSafetyDiagnosticsDto;
}

// Renderer-safe summary for one reconcile preflight run.
// This keeps the IPC contract bounded and leaves full lineage detail in main/DB storage.
export interface ReconcilePreflightSummaryReport {
	runId: number;
	// Anime DB version at the time the user forked - null when not tracked.
	fromAnimeDbVersion: string | null;
	// Current stamped anime DB version.
	toAnimeDbVersion: string;
	startedAt: number;
	completedAt: number;
	summary: ReconcilePreflightSummary;
}

export interface ReconcilePreflightReport extends ReconcilePreflightSummaryReport {
	items: ReconcileLineageItem[];
}

export interface ReconcileApplySummary {
	newGroupsImported: number;
	existingLineagesUpdatedWithNewMedias: number;
	importedMediaCount: number;
	cleanLineagesMarkedSeen: number;
	userDeletedLineagesSkipped: number;
	conflictsSkipped: number;
}

// Renderer-safe summary for one safe reconcile apply run.
// The detailed lineage rows stay in main/DB storage; IPC only carries aggregate outcome data.
export interface ReconcileApplySummaryReport {
	runId: number;
	fromAnimeDbVersion: string | null;
	toAnimeDbVersion: string;
	// Timestamp when the preflight stage for this apply run started.
	startedAt: number;
	// Timestamp when the persisted preflight stage completed.
	preflightCompletedAt: number;
	// Timestamp when the safe auto-import stage finished.
	appliedAt: number;
	preflightSummary: ReconcilePreflightSummary;
	applySummary: ReconcileApplySummary;
}

// Main-process-only reconcile apply result.
// This keeps the bounded report separate from the grouping mutation impact used for BUS invalidation.
export interface ReconcileApplyExecutionResult {
	report: ReconcileApplySummaryReport;
	impact: GroupingMutationImpactDto;
}
