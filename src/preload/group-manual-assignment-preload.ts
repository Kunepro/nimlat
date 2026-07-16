import { IpcChannels } from "@nimlat/constants/ipc-channels";
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
import { ipcRenderer } from "electron";

export const groupManualAssignmentApi = {
	groupAssignments: {
		assignMediasManual:              (request: GroupManualAssignMediasRequest): Promise<GroupMediaAssignmentActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupAssignMediasToGroupManual,
			request,
		),
		assignLibrarySelectionToGroup:   (request: GroupManualAssignLibrarySelectionRequest): Promise<GroupMediaAssignmentActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupAssignLibrarySelectionToGroupManual,
			request,
		),
		createGroupFromLibrarySelection: (request: GroupManualCreateGroupFromLibrarySelectionRequest): Promise<GroupCreateFromSelectionActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupCreateFromLibrarySelectionManual,
			request,
		),
		mergeLibrarySelectionIntoGroup:  (request: GroupManualMergeLibrarySelectionRequest): Promise<GroupMutationActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupMergeLibrarySelectionIntoGroupManual,
			request,
		),
		createMergedGroupFromLibrarySelection: (request: GroupManualCreateMergedGroupFromLibrarySelectionRequest): Promise<GroupCreateFromSelectionActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupCreateMergedGroupFromLibrarySelectionManual,
			request,
		),
		removeMediaManual:               (request: GroupManualRemoveMediaRequest): Promise<GroupMediaAssignmentActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupRemoveMediaFromGroupManual,
			request,
		),
		deleteGroupManual:               (request: GroupManualDeleteRequest): Promise<GroupMutationActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupDeleteManual,
			request,
		),
		mergeGroupsManual:               (request: GroupManualMergeRequest): Promise<GroupMutationActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupMergeManual,
			request,
		),
		restoreDeletedLineage:           (request: GroupRestoreDeletedLineageRequest): Promise<GroupRestoreDeletedLineageActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupRestoreDeletedLineage,
			request,
		),
		rebuildFromCurrentAnimeDefaults: (): Promise<GroupMutationActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupRebuildFromCurrentAnimeDefaults,
		),
		resetToAnimeGrouping:            (): Promise<GroupMutationActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupResetToAnimeGrouping,
		),
		runReconcilePreflight:           (): Promise<ReconcilePreflightActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupRunReconcilePreflight,
		),
		runReconcileSafeApply:           (): Promise<ReconcileApplyActionResult> => ipcRenderer.invoke(
			IpcChannels.GroupRunReconcileSafeApply,
		),
	},
};
