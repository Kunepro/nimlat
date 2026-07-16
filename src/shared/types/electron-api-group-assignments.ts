import type {
	GroupCreateFromSelectionActionResult,
	GroupManualAssignLibrarySelectionRequest,
	GroupManualAssignMediasRequest,
	GroupManualCreateGroupFromLibrarySelectionRequest,
	GroupManualCreateMergedGroupFromLibrarySelectionRequest,
	GroupManualDeleteRequest,
	GroupManualMergeLibrarySelectionRequest,
	GroupManualMergeRequest,
	GroupManualRemoveMediaRequest,
	GroupMediaAssignmentActionResult,
	GroupMutationActionResult,
	GroupRestoreDeletedLineageActionResult,
	GroupRestoreDeletedLineageRequest,
} from "./ipc-group-mutation-payloads";
import type {
	ReconcileApplyActionResult,
	ReconcilePreflightActionResult,
} from "./ipc-reconcile-payloads";

// Group assignment mutations are commands only. Side effects are published by
// main-process BUS events and observed through the groupExplorer event API.
export interface GroupAssignmentsElectronApi {
	assignMediasManual(request: GroupManualAssignMediasRequest): Promise<GroupMediaAssignmentActionResult>;

	assignLibrarySelectionToGroup(request: GroupManualAssignLibrarySelectionRequest): Promise<GroupMediaAssignmentActionResult>;

	createGroupFromLibrarySelection(request: GroupManualCreateGroupFromLibrarySelectionRequest): Promise<GroupCreateFromSelectionActionResult>;

	mergeLibrarySelectionIntoGroup(request: GroupManualMergeLibrarySelectionRequest): Promise<GroupMutationActionResult>;

	createMergedGroupFromLibrarySelection(request: GroupManualCreateMergedGroupFromLibrarySelectionRequest): Promise<GroupCreateFromSelectionActionResult>;

	removeMediaManual(request: GroupManualRemoveMediaRequest): Promise<GroupMediaAssignmentActionResult>;

	deleteGroupManual(request: GroupManualDeleteRequest): Promise<GroupMutationActionResult>;

	mergeGroupsManual(request: GroupManualMergeRequest): Promise<GroupMutationActionResult>;

	restoreDeletedLineage(request: GroupRestoreDeletedLineageRequest): Promise<GroupRestoreDeletedLineageActionResult>;

	rebuildFromCurrentAnimeDefaults(): Promise<GroupMutationActionResult>;

	resetToAnimeGrouping(): Promise<GroupMutationActionResult>;

	runReconcilePreflight(): Promise<ReconcilePreflightActionResult>;

	runReconcileSafeApply(): Promise<ReconcileApplyActionResult>;
}
