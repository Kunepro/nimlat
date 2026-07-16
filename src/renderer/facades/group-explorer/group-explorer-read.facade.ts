import type { ElectronAPI } from "@nimlat/types/electron-api";

type GroupExplorerApi = ElectronAPI["groupExplorer"];

// Read-side facade for Library/group/media/people inspection models. Components
// consume this control panel instead of touching preload directly.
export const GroupExplorerReadFacade = {
	listLibraryItems: (...args: Parameters<GroupExplorerApi["listLibraryItems"]>): ReturnType<GroupExplorerApi["listLibraryItems"]> => {
		return window.electronAPI.groupExplorer.listLibraryItems(...args);
	},

	listLibraryItemsRange: (...args: Parameters<GroupExplorerApi["listLibraryItemsRange"]>): ReturnType<GroupExplorerApi["listLibraryItemsRange"]> => {
		return window.electronAPI.groupExplorer.listLibraryItemsRange(...args);
	},

	listLibraryFilterOptions: (...args: Parameters<GroupExplorerApi["listLibraryFilterOptions"]>): ReturnType<GroupExplorerApi["listLibraryFilterOptions"]> => {
		return window.electronAPI.groupExplorer.listLibraryFilterOptions(...args);
	},

	listCards: (...args: Parameters<GroupExplorerApi["listCards"]>): ReturnType<GroupExplorerApi["listCards"]> => {
		return window.electronAPI.groupExplorer.listCards(...args);
	},

	getInspectionSummary: (...args: Parameters<GroupExplorerApi["getInspectionSummary"]>): ReturnType<GroupExplorerApi["getInspectionSummary"]> => {
		return window.electronAPI.groupExplorer.getInspectionSummary(...args);
	},

	listGroupMediaRange: (...args: Parameters<GroupExplorerApi["listGroupMediaRange"]>): ReturnType<GroupExplorerApi["listGroupMediaRange"]> => {
		return window.electronAPI.groupExplorer.listGroupMediaRange(...args);
	},

	getReleaseTimeline: (...args: Parameters<GroupExplorerApi["getReleaseTimeline"]>): ReturnType<GroupExplorerApi["getReleaseTimeline"]> => {
		return window.electronAPI.groupExplorer.getReleaseTimeline(...args);
	},

	getMediaInspection: (...args: Parameters<GroupExplorerApi["getMediaInspection"]>): ReturnType<GroupExplorerApi["getMediaInspection"]> => {
		return window.electronAPI.groupExplorer.getMediaInspection(...args);
	},

	listMediaCharacters: (...args: Parameters<GroupExplorerApi["listMediaCharacters"]>): ReturnType<GroupExplorerApi["listMediaCharacters"]> => {
		return window.electronAPI.groupExplorer.listMediaCharacters(...args);
	},

	listMediaStaff: (...args: Parameters<GroupExplorerApi["listMediaStaff"]>): ReturnType<GroupExplorerApi["listMediaStaff"]> => {
		return window.electronAPI.groupExplorer.listMediaStaff(...args);
	},

	getCharacterInspection: (...args: Parameters<GroupExplorerApi["getCharacterInspection"]>): ReturnType<GroupExplorerApi["getCharacterInspection"]> => {
		return window.electronAPI.groupExplorer.getCharacterInspection(...args);
	},

	getVoiceActorInspection: (...args: Parameters<GroupExplorerApi["getVoiceActorInspection"]>): ReturnType<GroupExplorerApi["getVoiceActorInspection"]> => {
		return window.electronAPI.groupExplorer.getVoiceActorInspection(...args);
	},

	getStaffInspection: (...args: Parameters<GroupExplorerApi["getStaffInspection"]>): ReturnType<GroupExplorerApi["getStaffInspection"]> => {
		return window.electronAPI.groupExplorer.getStaffInspection(...args);
	},

	getMediaEpisodeUpdatesIssue: (...args: Parameters<GroupExplorerApi["getMediaEpisodeUpdatesIssue"]>): ReturnType<GroupExplorerApi["getMediaEpisodeUpdatesIssue"]> => {
		return window.electronAPI.groupExplorer.getMediaEpisodeUpdatesIssue(...args);
	},

	getGroupingMode: (...args: Parameters<GroupExplorerApi["getGroupingMode"]>): ReturnType<GroupExplorerApi["getGroupingMode"]> => {
		return window.electronAPI.groupExplorer.getGroupingMode(...args);
	},
} as const;
