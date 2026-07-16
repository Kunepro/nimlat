import { UserDbFacade } from "@nimlat/database";
import type { ReconcilePreflightSummaryReport } from "@nimlat/types/anime-db";
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
	LibrarySelectionInput,
	ReconcileApplyActionResult,
	ReconcilePreflightActionResult,
} from "@nimlat/types/ipc-payloads";
import { GroupMutationService } from "../group/group-mutation-service";
import { GroupReconcileApplyService } from "../group/group-reconcile-apply-service";
import { GroupReconcilePreflightService } from "../group/group-reconcile-preflight-service";
import { resolveLibrarySelectionMediaIds } from "./resolve-library-selection-media-ids";

type ManualGroupingMode = "admin" | "user" | "anime";

export function assignMediasToGroupManually(request: GroupManualAssignMediasRequest): GroupMediaAssignmentActionResult {
	const mode = resolveManualGroupingMode();
	if (mode === "admin") {
		GroupMutationService.assignMediasToGroup(
			request.groupId,
			request.mediaIds,
			true,
		);
	} else if (mode === "user") {
		GroupMutationService.assignMediasToGroup(
			request.groupId,
			request.mediaIds,
			false,
		);
	} else {
		GroupMutationService.forkAndAssignMediasToGroup(
			request.groupId,
			request.mediaIds,
		);
	}
	return { success: true };
}

export function assignLibrarySelectionToGroupManually(request: GroupManualAssignLibrarySelectionRequest): GroupMediaAssignmentActionResult {
	const mediaIds = resolveLibrarySelectionMediaIds(request.items);
	if (mediaIds.length === 0) {
		return {
			success: false,
			error:   "No medias are available in the current selection.",
		};
	}

	return assignMediasToGroupManually({
		groupId: request.groupId,
		mediaIds,
	});
}

export function createGroupFromLibrarySelection(request: GroupManualCreateGroupFromLibrarySelectionRequest): GroupCreateFromSelectionActionResult {
	const mediaIds       = resolveLibrarySelectionMediaIds(request.items);
	const createdGroupId = resolveManualGroupingMode() === "admin"
		? GroupMutationService.createOfficialManualGroup(
			request.name,
			mediaIds,
		)
		: GroupMutationService.createManualGroup(
			request.name,
			mediaIds,
		);
	return {
		success: true,
		createdGroupId,
	};
}

// Merge-into-target needs both selected group containers and standalone media
// because Add To can merge groups while also assigning extra media rows.
export function mergeLibrarySelectionIntoGroup(request: GroupManualMergeLibrarySelectionRequest): GroupMutationActionResult {
	const selectedGroupIds = resolveSelectedGroupIds(request.items);
	if (selectedGroupIds.length < 2) {
		return {
			success: false,
			error:   "Select at least two groups to merge.",
		};
	}
	if (!selectedGroupIds.includes(request.targetGroupId)) {
		return {
			success: false,
			error:   "Merge target must be one of the selected groups.",
		};
	}

	const mediaIds = resolveLibrarySelectionMediaIds(request.items);
	if (resolveManualGroupingMode() === "admin") {
		GroupMutationService.mergeOfficialGroupsIntoTarget(
			request.targetGroupId,
			selectedGroupIds.filter((groupId) => groupId !== request.targetGroupId),
		);
		GroupMutationService.assignMediasToGroup(
			request.targetGroupId,
			mediaIds,
			true,
		);
	} else {
		GroupMutationService.mergeLibrarySelectionIntoTarget(
			request.targetGroupId,
			selectedGroupIds,
			mediaIds,
		);
	}
	return { success: true };
}

export function createMergedGroupFromLibrarySelection(request: GroupManualCreateMergedGroupFromLibrarySelectionRequest): GroupCreateFromSelectionActionResult {
	const selectedGroupIds = resolveSelectedGroupIds(request.items);
	if (selectedGroupIds.length < 1) {
		return {
			success: false,
			error:   "Select at least one group to replace.",
		};
	}

	const mediaIds       = resolveLibrarySelectionMediaIds(request.items);
	const createdGroupId = resolveManualGroupingMode() === "admin"
		? GroupMutationService.createMergedOfficialGroup(
			request.name,
			selectedGroupIds,
			mediaIds,
		)
		: GroupMutationService.createMergedGroup(
			request.name,
			selectedGroupIds,
			mediaIds,
		);

	return {
		success: true,
		createdGroupId,
	};
}

export function removeMediaFromGroupManually(request: GroupManualRemoveMediaRequest): GroupMediaAssignmentActionResult {
	const mode = resolveManualGroupingMode();
	if (mode === "admin") {
		GroupMutationService.removeMediaFromOfficialGroup(
			request.groupId,
			request.mediaId,
		);
	} else if (mode === "user") {
		GroupMutationService.removeMediaFromGroup(
			request.groupId,
			request.mediaId,
		);
	} else {
		GroupMutationService.forkAndRemoveMediaFromGroup(
			request.groupId,
			request.mediaId,
		);
	}
	return { success: true };
}

export function deleteGroupManually(request: GroupManualDeleteRequest): GroupMutationActionResult {
	const mode = resolveManualGroupingMode();
	if (mode === "admin" && request.group.source === "official") {
		GroupMutationService.deleteOfficialGroup(request.group.groupId);
	} else if (request.group.source === "official") {
		GroupMutationService.hideOfficialGroup(request.group.groupId);
	} else if (mode === "user") {
		GroupMutationService.deleteGroup(request.group.groupId);
	} else {
		GroupMutationService.forkAndDeleteGroup(request.group.groupId);
	}
	return { success: true };
}

export function mergeGroupsManually(request: GroupManualMergeRequest): GroupMutationActionResult {
	if (resolveManualGroupingMode() === "admin") {
		GroupMutationService.mergeOfficialGroupsIntoTarget(
			request.targetGroupId,
			request.sourceGroupIds,
		);
	} else {
		GroupMutationService.mergeGroupsIntoTarget(
			request.targetGroupId,
			request.sourceGroupIds,
		);
	}
	return { success: true };
}

export function resetToAnimeGrouping(): GroupMutationActionResult {
	GroupMutationService.resetToAnimeDefaults();
	return { success: true };
}

export function restoreDeletedLineage(request: GroupRestoreDeletedLineageRequest): GroupRestoreDeletedLineageActionResult {
	return {
		success:         true,
		restoredGroupId: GroupMutationService.restoreDeletedUpstreamLineage(request.groupLineageId),
	};
}

export function rebuildFromCurrentAnimeDefaults(): GroupMutationActionResult {
	GroupMutationService.rebuildFromCurrentAnimeDefaults();
	return { success: true };
}

export function runReconcilePreflight(): ReconcilePreflightActionResult {
	const fullReport                              = GroupReconcilePreflightService.runPreflight();
	const report: ReconcilePreflightSummaryReport = {
		runId:              fullReport.runId,
		fromAnimeDbVersion: fullReport.fromAnimeDbVersion,
		toAnimeDbVersion:   fullReport.toAnimeDbVersion,
		startedAt:          fullReport.startedAt,
		completedAt:        fullReport.completedAt,
		summary:            fullReport.summary,
	};
	return {
		success: true,
		report,
	};
}

export function runReconcileSafeApply(): ReconcileApplyActionResult {
	return {
		success: true,
		report:  GroupReconcileApplyService.runSafeApply(),
	};
}

function resolveSelectedGroupIds(items: LibrarySelectionInput[]): number[] {
	return Array.from(new Set(items.flatMap((item) => item.kind === "group" ? [ item.group.groupId ] : [])));
}

function resolveManualGroupingMode(): ManualGroupingMode {
	if (UserDbFacade.config.isAdminModeEnabled()) {
		return "admin";
	}

	return UserDbFacade.grouping.getState().groupingMode === "user" ? "user" : "anime";
}
