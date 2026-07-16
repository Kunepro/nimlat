import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
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
	ReconcileApplyActionResult,
	ReconcilePreflightActionResult,
} from "@nimlat/types/ipc-payloads";
import * as GroupManualAssignmentOperations from "./group-manual-assignment-operations";

type ManualActionFailure = { success: false; error: string };
type ManualActionResult = { success: true } | ManualActionFailure;

/*
 * Manual group assignment service (IPC-facing).
 * Keep this layer as a narrow error boundary; routing policy and mutations live in the operations module.
 */
export class GroupManualAssignmentService {
	public static assignMediasToGroupManually(request: GroupManualAssignMediasRequest): GroupMediaAssignmentActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.assign-medias",
			{ ...request },
			() => GroupManualAssignmentOperations.assignMediasToGroupManually(request),
		);
	}

	public static assignLibrarySelectionToGroupManually(request: GroupManualAssignLibrarySelectionRequest): GroupMediaAssignmentActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.assign-library-selection",
			{
				groupId: request.groupId,
				items:   request.items,
			},
			() => GroupManualAssignmentOperations.assignLibrarySelectionToGroupManually(request),
		);
	}

	public static createGroupFromLibrarySelection(request: GroupManualCreateGroupFromLibrarySelectionRequest): GroupCreateFromSelectionActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.create-group-from-library-selection",
			{
				name:  request.name,
				items: request.items,
			},
			() => GroupManualAssignmentOperations.createGroupFromLibrarySelection(request),
		);
	}

	public static mergeLibrarySelectionIntoGroup(request: GroupManualMergeLibrarySelectionRequest): GroupMutationActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.merge-library-selection",
			{
				targetGroupId: request.targetGroupId,
				items:         request.items,
			},
			() => GroupManualAssignmentOperations.mergeLibrarySelectionIntoGroup(request),
		);
	}

	public static createMergedGroupFromLibrarySelection(request: GroupManualCreateMergedGroupFromLibrarySelectionRequest): GroupCreateFromSelectionActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.create-merged-group-from-library-selection",
			{
				name:  request.name,
				items: request.items,
			},
			() => GroupManualAssignmentOperations.createMergedGroupFromLibrarySelection(request),
		);
	}

	public static removeMediaFromGroupManually(request: GroupManualRemoveMediaRequest): GroupMediaAssignmentActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.remove-media",
			{ ...request },
			() => GroupManualAssignmentOperations.removeMediaFromGroupManually(request),
		);
	}

	public static deleteGroupManually(request: GroupManualDeleteRequest): GroupMutationActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.delete-group",
			{ ...request },
			() => GroupManualAssignmentOperations.deleteGroupManually(request),
		);
	}

	public static mergeGroupsManually(request: GroupManualMergeRequest): GroupMutationActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.merge-groups",
			{ ...request },
			() => GroupManualAssignmentOperations.mergeGroupsManually(request),
		);
	}

	// Drop the forked snapshot and fall back to anime defaults while keeping IPC semantics aligned with manual actions.
	public static resetToAnimeGrouping(): GroupMutationActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.reset-to-anime-grouping",
			undefined,
			() => GroupManualAssignmentOperations.resetToAnimeGrouping(),
		);
	}

	// Restore one deleted official lineage into the current forked user snapshot.
	public static restoreDeletedLineage(request: GroupRestoreDeletedLineageRequest): GroupRestoreDeletedLineageActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.restore-deleted-lineage",
			{ ...request },
			() => GroupManualAssignmentOperations.restoreDeletedLineage(request),
		);
	}

	// Rebuild the forked snapshot from current anime defaults while keeping user grouping mode enabled.
	public static rebuildFromCurrentAnimeDefaults(): GroupMutationActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.rebuild-from-current-anime-defaults",
			undefined,
			() => GroupManualAssignmentOperations.rebuildFromCurrentAnimeDefaults(),
		);
	}

	// Preflight stays read-only and returns only the bounded summary projection, not the full lineage list.
	public static runReconcilePreflight(): ReconcilePreflightActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.run-reconcile-preflight",
			undefined,
			() => GroupManualAssignmentOperations.runReconcilePreflight(),
		);
	}

	// Safe apply returns only the bounded aggregate outcome for the mutation run.
	public static runReconcileSafeApply(): ReconcileApplyActionResult {
		return runManualAssignmentOperation(
			"group.manual-assignment.run-reconcile-safe-apply",
			undefined,
			() => GroupManualAssignmentOperations.runReconcileSafeApply(),
		);
	}
}

function runManualAssignmentOperation<T extends ManualActionResult>(
	logContext: string,
	metadata: Record<string, unknown> | undefined,
	operation: () => T,
): T | ManualActionFailure {
	try {
		return operation();
	} catch (error) {
		const tsError = typeSafeError(error);
		if (metadata) {
			LoggerUtils.logMainServiceError(
				logContext,
				tsError,
				metadata,
			);
		} else {
			LoggerUtils.logMainServiceError(
				logContext,
				tsError,
			);
		}
		return {
			success: false,
			error:   tsError.message,
		};
	}
}
