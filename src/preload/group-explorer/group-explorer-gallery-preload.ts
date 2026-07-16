import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { GroupExplorerElectronApi } from "@nimlat/types/electron-api";
import { ipcRenderer } from "electron";

type GroupExplorerGalleryPreloadApi = Pick<
	GroupExplorerElectronApi,
	| "deleteMediaImageGalleryImage"
	| "getEpisodeImageGallery"
	| "getGroupImageGallery"
	| "getMediaImageGallery"
	| "pickGroupImage"
	| "saveEpisodeImageGallery"
	| "saveGroupImageGallery"
	| "saveMediaImageGallery"
	| "uploadEpisodeImageGalleryImage"
	| "uploadGroupImageGalleryImage"
	| "uploadMediaImageGalleryImage"
>;

// Image-gallery bridge methods are grouped because they all cross the same
// renderer -> preload -> image service boundary with user-managed files.
export const groupExplorerGalleryPreloadApi: GroupExplorerGalleryPreloadApi = {
	pickGroupImage:                 () => ipcRenderer.invoke(
		IpcChannels.GroupPickImage,
	),
	getGroupImageGallery:           (group) => ipcRenderer.invoke(
		IpcChannels.GroupGetImageGallery,
		group,
	),
	uploadGroupImageGalleryImage:   (request) => ipcRenderer.invoke(
		IpcChannels.GroupUploadImageGalleryImage,
		request,
	),
	saveGroupImageGallery:          (request) => ipcRenderer.invoke(
		IpcChannels.GroupSaveImageGallery,
		request,
	),
	getMediaImageGallery:           (mediaId) => ipcRenderer.invoke(
		IpcChannels.MediaGetImageGallery,
		mediaId,
	),
	uploadMediaImageGalleryImage:   (request) => ipcRenderer.invoke(
		IpcChannels.MediaUploadImageGalleryImage,
		request,
	),
	deleteMediaImageGalleryImage:   (request) => ipcRenderer.invoke(
		IpcChannels.MediaDeleteImageGalleryImage,
		request,
	),
	saveMediaImageGallery:          (request) => ipcRenderer.invoke(
		IpcChannels.MediaSaveImageGallery,
		request,
	),
	getEpisodeImageGallery:         (mediaId, episodeNumber) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeGetImageGallery,
		mediaId,
		episodeNumber,
	),
	uploadEpisodeImageGalleryImage: (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeUploadImageGalleryImage,
		request,
	),
	saveEpisodeImageGallery:        (request) => ipcRenderer.invoke(
		IpcChannels.MediaEpisodeSaveImageGallery,
		request,
	),
};
