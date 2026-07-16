import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { GroupExplorerElectronApi } from "@nimlat/types/electron-api";
import { ipcRenderer } from "electron";

type GroupExplorerReadPreloadApi = Pick<
	GroupExplorerElectronApi,
	| "getCharacterInspection"
	| "getGroupingMode"
	| "getInspectionSummary"
	| "getMediaEpisodeUpdatesIssue"
	| "getMediaInspection"
	| "getReleaseTimeline"
	| "getStaffInspection"
	| "getVoiceActorInspection"
	| "listCards"
	| "listGroupMediaRange"
	| "listLibraryFilterOptions"
	| "listLibraryItems"
	| "listLibraryItemsRange"
	| "listMediaCharacters"
	| "listMediaStaff"
>;

// Read bridge for Library, media, group, and people inspection models. All
// queries stay owned by main/database code; preload only forwards IPC requests.
export const groupExplorerReadPreloadApi: GroupExplorerReadPreloadApi = {
	listLibraryItems:            (
																 offset,
		                             limit,
		                             search,
		                             scope   = "library",
		                             filters = {},
															 ) => ipcRenderer.invoke(
		IpcChannels.LibraryListDisplayItems,
		offset,
		limit,
		search,
		scope,
		filters,
	),
	listLibraryItemsRange:       (request) => ipcRenderer.invoke(
		IpcChannels.LibraryListDisplayItemsRange,
		request,
	),
	listLibraryFilterOptions:    () => ipcRenderer.invoke(
		IpcChannels.LibraryListFilterOptions,
	),
	listCards:                   (offset, limit, search) => ipcRenderer.invoke(
		IpcChannels.GroupListExplorerCards,
		offset,
		limit,
		search,
	),
	getInspectionSummary:        (group) => ipcRenderer.invoke(
		IpcChannels.GroupGetInspectionSummary,
		group,
	),
	listGroupMediaRange:         (request) => ipcRenderer.invoke(
		IpcChannels.GroupMediaListRange,
		request,
	),
	getReleaseTimeline:          (group) => ipcRenderer.invoke(
		IpcChannels.GroupGetReleaseTimeline,
		group,
	),
	getMediaInspection:          (mediaId, options) => ipcRenderer.invoke(
		IpcChannels.MediaGetInspection,
		mediaId,
		options,
	),
	listMediaCharacters:         (mediaId) => ipcRenderer.invoke(
		IpcChannels.MediaListCharacters,
		mediaId,
	),
	listMediaStaff:              (mediaId) => ipcRenderer.invoke(
		IpcChannels.MediaListStaff,
		mediaId,
	),
	getCharacterInspection:      (characterId) => ipcRenderer.invoke(
		IpcChannels.CharacterGetInspection,
		characterId,
	),
	getVoiceActorInspection:     (staffId) => ipcRenderer.invoke(
		IpcChannels.VoiceActorGetInspection,
		staffId,
	),
	getStaffInspection:          (staffId) => ipcRenderer.invoke(
		IpcChannels.StaffGetInspection,
		staffId,
	),
	getMediaEpisodeUpdatesIssue: (mediaId) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeUpdatesIssueGet,
		mediaId,
	),
	getGroupingMode:             () => ipcRenderer.invoke(
		IpcChannels.GroupGetGroupingMode,
	),
};
