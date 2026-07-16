import type { ElectronAPI } from "@nimlat/types/electron-api";

type GroupAssignmentsApi = ElectronAPI["groupAssignments"];

export class GroupAssignmentsFacade {
	public static assignMediasManual(...args: Parameters<GroupAssignmentsApi["assignMediasManual"]>): ReturnType<GroupAssignmentsApi["assignMediasManual"]> {
		return window.electronAPI.groupAssignments.assignMediasManual(...args);
	}

	public static assignLibrarySelectionToGroup(...args: Parameters<GroupAssignmentsApi["assignLibrarySelectionToGroup"]>): ReturnType<GroupAssignmentsApi["assignLibrarySelectionToGroup"]> {
		return window.electronAPI.groupAssignments.assignLibrarySelectionToGroup(...args);
	}

	public static createGroupFromLibrarySelection(...args: Parameters<GroupAssignmentsApi["createGroupFromLibrarySelection"]>): ReturnType<GroupAssignmentsApi["createGroupFromLibrarySelection"]> {
		return window.electronAPI.groupAssignments.createGroupFromLibrarySelection(...args);
	}

	public static mergeLibrarySelectionIntoGroup(...args: Parameters<GroupAssignmentsApi["mergeLibrarySelectionIntoGroup"]>): ReturnType<GroupAssignmentsApi["mergeLibrarySelectionIntoGroup"]> {
		return window.electronAPI.groupAssignments.mergeLibrarySelectionIntoGroup(...args);
	}

	public static createMergedGroupFromLibrarySelection(...args: Parameters<GroupAssignmentsApi["createMergedGroupFromLibrarySelection"]>): ReturnType<GroupAssignmentsApi["createMergedGroupFromLibrarySelection"]> {
		return window.electronAPI.groupAssignments.createMergedGroupFromLibrarySelection(...args);
	}

	public static removeMediaManual(...args: Parameters<GroupAssignmentsApi["removeMediaManual"]>): ReturnType<GroupAssignmentsApi["removeMediaManual"]> {
		return window.electronAPI.groupAssignments.removeMediaManual(...args);
	}

	public static deleteGroupManual(...args: Parameters<GroupAssignmentsApi["deleteGroupManual"]>): ReturnType<GroupAssignmentsApi["deleteGroupManual"]> {
		return window.electronAPI.groupAssignments.deleteGroupManual(...args);
	}

	public static mergeGroupsManual(...args: Parameters<GroupAssignmentsApi["mergeGroupsManual"]>): ReturnType<GroupAssignmentsApi["mergeGroupsManual"]> {
		return window.electronAPI.groupAssignments.mergeGroupsManual(...args);
	}

	public static restoreDeletedLineage(...args: Parameters<GroupAssignmentsApi["restoreDeletedLineage"]>): ReturnType<GroupAssignmentsApi["restoreDeletedLineage"]> {
		return window.electronAPI.groupAssignments.restoreDeletedLineage(...args);
	}

	public static rebuildFromCurrentAnimeDefaults(...args: Parameters<GroupAssignmentsApi["rebuildFromCurrentAnimeDefaults"]>): ReturnType<GroupAssignmentsApi["rebuildFromCurrentAnimeDefaults"]> {
		return window.electronAPI.groupAssignments.rebuildFromCurrentAnimeDefaults(...args);
	}

	public static resetToAnimeGrouping(...args: Parameters<GroupAssignmentsApi["resetToAnimeGrouping"]>): ReturnType<GroupAssignmentsApi["resetToAnimeGrouping"]> {
		return window.electronAPI.groupAssignments.resetToAnimeGrouping(...args);
	}

	public static runReconcilePreflight(...args: Parameters<GroupAssignmentsApi["runReconcilePreflight"]>): ReturnType<GroupAssignmentsApi["runReconcilePreflight"]> {
		return window.electronAPI.groupAssignments.runReconcilePreflight(...args);
	}

	public static runReconcileSafeApply(...args: Parameters<GroupAssignmentsApi["runReconcileSafeApply"]>): ReturnType<GroupAssignmentsApi["runReconcileSafeApply"]> {
		return window.electronAPI.groupAssignments.runReconcileSafeApply(...args);
	}
}
