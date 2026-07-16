import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	GroupManualAssignLibrarySelectionRequest,
	GroupManualAssignMediasRequest,
	GroupManualCreateGroupFromLibrarySelectionRequest,
	GroupManualCreateMergedGroupFromLibrarySelectionRequest,
	GroupManualDeleteRequest,
	GroupManualMergeLibrarySelectionRequest,
	GroupManualMergeRequest,
	GroupManualRemoveMediaRequest,
	GroupRestoreDeletedLineageRequest,
} from "@nimlat/types/ipc-payloads";
import { ipcMain } from "electron";
import { GroupManualAssignmentService } from "../services/group-assignment/group-manual-assignment-service";

export function registerGroupManualAssignmentHandlers(): void {
	ipcMain.handle(
		IpcChannels.GroupAssignMediasToGroupManual,
		(_event, request: GroupManualAssignMediasRequest) => GroupManualAssignmentService.assignMediasToGroupManually(request),
	);

	ipcMain.handle(
		IpcChannels.GroupAssignLibrarySelectionToGroupManual,
		(_event, request: GroupManualAssignLibrarySelectionRequest) => GroupManualAssignmentService.assignLibrarySelectionToGroupManually(request),
	);

	ipcMain.handle(
		IpcChannels.GroupCreateFromLibrarySelectionManual,
		(_event, request: GroupManualCreateGroupFromLibrarySelectionRequest) => GroupManualAssignmentService.createGroupFromLibrarySelection(request),
	);

	ipcMain.handle(
		IpcChannels.GroupMergeLibrarySelectionIntoGroupManual,
		(_event, request: GroupManualMergeLibrarySelectionRequest) => GroupManualAssignmentService.mergeLibrarySelectionIntoGroup(request),
	);

	ipcMain.handle(
		IpcChannels.GroupCreateMergedGroupFromLibrarySelectionManual,
		(_event, request: GroupManualCreateMergedGroupFromLibrarySelectionRequest) => GroupManualAssignmentService.createMergedGroupFromLibrarySelection(request),
	);

	ipcMain.handle(
		IpcChannels.GroupRemoveMediaFromGroupManual,
		(_event, request: GroupManualRemoveMediaRequest) => GroupManualAssignmentService.removeMediaFromGroupManually(request),
	);

	ipcMain.handle(
		IpcChannels.GroupDeleteManual,
		(_event, request: GroupManualDeleteRequest) => GroupManualAssignmentService.deleteGroupManually(request),
	);

	ipcMain.handle(
		IpcChannels.GroupMergeManual,
		(_event, request: GroupManualMergeRequest) => GroupManualAssignmentService.mergeGroupsManually(request),
	);

	ipcMain.handle(
		IpcChannels.GroupResetToAnimeGrouping,
		() => GroupManualAssignmentService.resetToAnimeGrouping(),
	);

	ipcMain.handle(
		IpcChannels.GroupRestoreDeletedLineage,
		(_event, request: GroupRestoreDeletedLineageRequest) => GroupManualAssignmentService.restoreDeletedLineage(request),
	);

	ipcMain.handle(
		IpcChannels.GroupRebuildFromCurrentAnimeDefaults,
		() => GroupManualAssignmentService.rebuildFromCurrentAnimeDefaults(),
	);

	ipcMain.handle(
		IpcChannels.GroupRunReconcilePreflight,
		() => GroupManualAssignmentService.runReconcilePreflight(),
	);

	ipcMain.handle(
		IpcChannels.GroupRunReconcileSafeApply,
		() => GroupManualAssignmentService.runReconcileSafeApply(),
	);
}
