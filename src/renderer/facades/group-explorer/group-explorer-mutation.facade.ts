import type { ElectronAPI } from "@nimlat/types/electron-api";

type GroupExplorerApi = ElectronAPI["groupExplorer"];

// Visible group/media mutations are delegated directly to preload. Main
// services own validation, DB writes, and renderer-visible BUS events.
export const GroupExplorerMutationFacade = {
	refreshMedia: (...args: Parameters<GroupExplorerApi["refreshMedia"]>): ReturnType<GroupExplorerApi["refreshMedia"]> => {
		return window.electronAPI.groupExplorer.refreshMedia(...args);
	},

	updateMediaDetails: (...args: Parameters<GroupExplorerApi["updateMediaDetails"]>): ReturnType<GroupExplorerApi["updateMediaDetails"]> => {
		return window.electronAPI.groupExplorer.updateMediaDetails(...args);
	},

	saveMediaEdit: (...args: Parameters<GroupExplorerApi["saveMediaEdit"]>): ReturnType<GroupExplorerApi["saveMediaEdit"]> => {
		return window.electronAPI.groupExplorer.saveMediaEdit(...args);
	},

	resetMediaDetails: (...args: Parameters<GroupExplorerApi["resetMediaDetails"]>): ReturnType<GroupExplorerApi["resetMediaDetails"]> => {
		return window.electronAPI.groupExplorer.resetMediaDetails(...args);
	},

	updateEpisodeDetails: (...args: Parameters<GroupExplorerApi["updateEpisodeDetails"]>): ReturnType<GroupExplorerApi["updateEpisodeDetails"]> => {
		return window.electronAPI.groupExplorer.updateEpisodeDetails(...args);
	},

	saveEpisodeEdit: (...args: Parameters<GroupExplorerApi["saveEpisodeEdit"]>): ReturnType<GroupExplorerApi["saveEpisodeEdit"]> => {
		return window.electronAPI.groupExplorer.saveEpisodeEdit(...args);
	},

	resetEpisodeDetails: (...args: Parameters<GroupExplorerApi["resetEpisodeDetails"]>): ReturnType<GroupExplorerApi["resetEpisodeDetails"]> => {
		return window.electronAPI.groupExplorer.resetEpisodeDetails(...args);
	},

	setEpisodeIntegrationStatus: (...args: Parameters<GroupExplorerApi["setEpisodeIntegrationStatus"]>): ReturnType<GroupExplorerApi["setEpisodeIntegrationStatus"]> => {
		return window.electronAPI.groupExplorer.setEpisodeIntegrationStatus(...args);
	},

	setEpisodeIntegrationStatuses: (...args: Parameters<GroupExplorerApi["setEpisodeIntegrationStatuses"]>): ReturnType<GroupExplorerApi["setEpisodeIntegrationStatuses"]> => {
		return window.electronAPI.groupExplorer.setEpisodeIntegrationStatuses(...args);
	},

	saveEpisodeIntegrationState: (...args: Parameters<GroupExplorerApi["saveEpisodeIntegrationState"]>): ReturnType<GroupExplorerApi["saveEpisodeIntegrationState"]> => {
		return window.electronAPI.groupExplorer.saveEpisodeIntegrationState(...args);
	},

	setMediaIntegrationStatus: (...args: Parameters<GroupExplorerApi["setMediaIntegrationStatus"]>): ReturnType<GroupExplorerApi["setMediaIntegrationStatus"]> => {
		return window.electronAPI.groupExplorer.setMediaIntegrationStatus(...args);
	},

	saveMediaIntegrationState: (...args: Parameters<GroupExplorerApi["saveMediaIntegrationState"]>): ReturnType<GroupExplorerApi["saveMediaIntegrationState"]> => {
		return window.electronAPI.groupExplorer.saveMediaIntegrationState(...args);
	},

	setMediaWatchState: (...args: Parameters<GroupExplorerApi["setMediaWatchState"]>): ReturnType<GroupExplorerApi["setMediaWatchState"]> => {
		return window.electronAPI.groupExplorer.setMediaWatchState(...args);
	},

	setEpisodeWatchState: (...args: Parameters<GroupExplorerApi["setEpisodeWatchState"]>): ReturnType<GroupExplorerApi["setEpisodeWatchState"]> => {
		return window.electronAPI.groupExplorer.setEpisodeWatchState(...args);
	},

	setEpisodeWatchStates: (...args: Parameters<GroupExplorerApi["setEpisodeWatchStates"]>): ReturnType<GroupExplorerApi["setEpisodeWatchStates"]> => {
		return window.electronAPI.groupExplorer.setEpisodeWatchStates(...args);
	},

	retryMediaEpisodeUpdates: (...args: Parameters<GroupExplorerApi["retryMediaEpisodeUpdates"]>): ReturnType<GroupExplorerApi["retryMediaEpisodeUpdates"]> => {
		return window.electronAPI.groupExplorer.retryMediaEpisodeUpdates(...args);
	},

	refreshGroup: (...args: Parameters<GroupExplorerApi["refreshGroup"]>): ReturnType<GroupExplorerApi["refreshGroup"]> => {
		return window.electronAPI.groupExplorer.refreshGroup(...args);
	},

	setGroupIntegrationStatus: (...args: Parameters<GroupExplorerApi["setGroupIntegrationStatus"]>): ReturnType<GroupExplorerApi["setGroupIntegrationStatus"]> => {
		return window.electronAPI.groupExplorer.setGroupIntegrationStatus(...args);
	},

	setGroupWatchState: (...args: Parameters<GroupExplorerApi["setGroupWatchState"]>): ReturnType<GroupExplorerApi["setGroupWatchState"]> => {
		return window.electronAPI.groupExplorer.setGroupWatchState(...args);
	},

	updateGroupDetails: (...args: Parameters<GroupExplorerApi["updateGroupDetails"]>): ReturnType<GroupExplorerApi["updateGroupDetails"]> => {
		return window.electronAPI.groupExplorer.updateGroupDetails(...args);
	},

	saveGroupEdit: (...args: Parameters<GroupExplorerApi["saveGroupEdit"]>): ReturnType<GroupExplorerApi["saveGroupEdit"]> => {
		return window.electronAPI.groupExplorer.saveGroupEdit(...args);
	},
} as const;
