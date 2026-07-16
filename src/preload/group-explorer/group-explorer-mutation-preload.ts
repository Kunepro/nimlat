import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { GroupExplorerElectronApi } from "@nimlat/types/electron-api";
import { ipcRenderer } from "electron";

type GroupExplorerMutationPreloadApi = Pick<
	GroupExplorerElectronApi,
	| "refreshGroup"
	| "refreshMedia"
	| "resetEpisodeDetails"
	| "resetMediaDetails"
	| "retryMediaEpisodeUpdates"
	| "saveEpisodeEdit"
	| "saveEpisodeIntegrationState"
	| "saveGroupEdit"
	| "saveMediaEdit"
	| "saveMediaIntegrationState"
	| "setEpisodeIntegrationStatus"
	| "setEpisodeIntegrationStatuses"
	| "setEpisodeWatchState"
	| "setEpisodeWatchStates"
	| "setGroupIntegrationStatus"
	| "setGroupWatchState"
	| "setMediaIntegrationStatus"
	| "setMediaWatchState"
	| "updateEpisodeDetails"
	| "updateGroupDetails"
	| "updateMediaDetails"
>;

// Mutation bridge for visible media/group state. Business rules and BUS events
// stay in main services; preload only forwards typed IPC requests.
export const groupExplorerMutationPreloadApi: GroupExplorerMutationPreloadApi = {
	refreshMedia:                  (mediaId) => ipcRenderer.invoke(
		IpcChannels.MediaRefresh,
		mediaId,
	),
	updateMediaDetails:            (request) => ipcRenderer.invoke(
		IpcChannels.MediaUpdateDetails,
		request,
	),
	saveMediaEdit:                 (request) => ipcRenderer.invoke(
		IpcChannels.MediaSaveEdit,
		request,
	),
	resetMediaDetails:             (request) => ipcRenderer.invoke(
		IpcChannels.MediaResetDetails,
		request,
	),
	updateEpisodeDetails:          (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeUpdateDetails,
		request,
	),
	saveEpisodeEdit:               (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeSaveEdit,
		request,
	),
	resetEpisodeDetails:           (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeResetDetails,
		request,
	),
	setEpisodeIntegrationStatus:   (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeIntegrationSet,
		request,
	),
	setEpisodeIntegrationStatuses: (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeIntegrationBulkSet,
		request,
	),
	saveEpisodeIntegrationState:   (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeIntegrationSave,
		request,
	),
	setMediaIntegrationStatus:     (request) => ipcRenderer.invoke(
		IpcChannels.MediaIntegrationSet,
		request,
	),
	saveMediaIntegrationState:     (request) => ipcRenderer.invoke(
		IpcChannels.MediaIntegrationSave,
		request,
	),
	setMediaWatchState:            (request) => ipcRenderer.invoke(
		IpcChannels.MediaWatchStateSet,
		request,
	),
	setEpisodeWatchState:          (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeWatchStateSet,
		request,
	),
	setEpisodeWatchStates:         (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeWatchStatesSet,
		request,
	),
	retryMediaEpisodeUpdates:      (mediaId) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeUpdatesRetry,
		mediaId,
	),
	refreshGroup:                  (group) => ipcRenderer.invoke(
		IpcChannels.GroupRefresh,
		group,
	),
	setGroupIntegrationStatus:     (request) => ipcRenderer.invoke(
		IpcChannels.GroupIntegrationSet,
		request,
	),
	setGroupWatchState:            (request) => ipcRenderer.invoke(
		IpcChannels.GroupWatchStateSet,
		request,
	),
	updateGroupDetails:            (request) => ipcRenderer.invoke(
		IpcChannels.GroupUpdateDetails,
		request,
	),
	saveGroupEdit:                 (request) => ipcRenderer.invoke(
		IpcChannels.GroupSaveEdit,
		request,
	),
};
