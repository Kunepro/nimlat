import type { ElectronAPI } from "@nimlat/types/electron-api";

type GroupExplorerApi = ElectronAPI["groupExplorer"];

// Gallery commands are grouped because they all cross the renderer image/file
// boundary while main services keep validation and ownership rules.
export const GroupExplorerGalleryFacade = {
	pickGroupImage: (...args: Parameters<GroupExplorerApi["pickGroupImage"]>): ReturnType<GroupExplorerApi["pickGroupImage"]> => {
		return window.electronAPI.groupExplorer.pickGroupImage(...args);
	},

	getGroupImageGallery: (...args: Parameters<GroupExplorerApi["getGroupImageGallery"]>): ReturnType<GroupExplorerApi["getGroupImageGallery"]> => {
		return window.electronAPI.groupExplorer.getGroupImageGallery(...args);
	},

	uploadGroupImageGalleryImage: (...args: Parameters<GroupExplorerApi["uploadGroupImageGalleryImage"]>): ReturnType<GroupExplorerApi["uploadGroupImageGalleryImage"]> => {
		return window.electronAPI.groupExplorer.uploadGroupImageGalleryImage(...args);
	},

	saveGroupImageGallery: (...args: Parameters<GroupExplorerApi["saveGroupImageGallery"]>): ReturnType<GroupExplorerApi["saveGroupImageGallery"]> => {
		return window.electronAPI.groupExplorer.saveGroupImageGallery(...args);
	},

	getMediaImageGallery: (...args: Parameters<GroupExplorerApi["getMediaImageGallery"]>): ReturnType<GroupExplorerApi["getMediaImageGallery"]> => {
		return window.electronAPI.groupExplorer.getMediaImageGallery(...args);
	},

	uploadMediaImageGalleryImage: (...args: Parameters<GroupExplorerApi["uploadMediaImageGalleryImage"]>): ReturnType<GroupExplorerApi["uploadMediaImageGalleryImage"]> => {
		return window.electronAPI.groupExplorer.uploadMediaImageGalleryImage(...args);
	},

	deleteMediaImageGalleryImage: (...args: Parameters<GroupExplorerApi["deleteMediaImageGalleryImage"]>): ReturnType<GroupExplorerApi["deleteMediaImageGalleryImage"]> => {
		return window.electronAPI.groupExplorer.deleteMediaImageGalleryImage(...args);
	},

	saveMediaImageGallery: (...args: Parameters<GroupExplorerApi["saveMediaImageGallery"]>): ReturnType<GroupExplorerApi["saveMediaImageGallery"]> => {
		return window.electronAPI.groupExplorer.saveMediaImageGallery(...args);
	},

	getEpisodeImageGallery: (...args: Parameters<GroupExplorerApi["getEpisodeImageGallery"]>): ReturnType<GroupExplorerApi["getEpisodeImageGallery"]> => {
		return window.electronAPI.groupExplorer.getEpisodeImageGallery(...args);
	},

	uploadEpisodeImageGalleryImage: (...args: Parameters<GroupExplorerApi["uploadEpisodeImageGalleryImage"]>): ReturnType<GroupExplorerApi["uploadEpisodeImageGalleryImage"]> => {
		return window.electronAPI.groupExplorer.uploadEpisodeImageGalleryImage(...args);
	},

	saveEpisodeImageGallery: (...args: Parameters<GroupExplorerApi["saveEpisodeImageGallery"]>): ReturnType<GroupExplorerApi["saveEpisodeImageGallery"]> => {
		return window.electronAPI.groupExplorer.saveEpisodeImageGallery(...args);
	},
} as const;
