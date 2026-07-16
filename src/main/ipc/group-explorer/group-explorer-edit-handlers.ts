import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	DeleteMediaImageGalleryImageRequest,
	ResetEpisodeDetailsRequest,
	ResetMediaDetailsRequest,
	SaveEpisodeEditRequest,
	SaveEpisodeImageGalleryRequest,
	SaveGroupEditRequest,
	SaveGroupImageGalleryRequest,
	SaveMediaEditRequest,
	SaveMediaImageGalleryRequest,
	UpdateEpisodeDetailsRequest,
	UpdateGroupDetailsRequest,
	UpdateMediaDetailsRequest,
	UploadEpisodeImageGalleryImageRequest,
	UploadGroupImageGalleryImageRequest,
	UploadMediaImageGalleryImageRequest,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { ipcMain } from "electron";
import { EpisodeEditService } from "../../services/episode/episode-edit-service";
import { GroupEditService } from "../../services/group/group-edit-service";
import { ImageGalleryService } from "../../services/image-cache/image-gallery-service";
import { MediaEditService } from "../../services/media/media-edit-service";

// Edit/image IPC handlers deliberately remain transport adapters. Rollback,
// gallery selection, and persistence rules live in the services they delegate to.
export function registerGroupExplorerEditHandlers(): void {
	ipcMain.handle(
		IpcChannels.GroupPickImage,
		() => GroupEditService.pickImage(),
	);

	ipcMain.handle(
		IpcChannels.GroupUpdateDetails,
		(_event, request: UpdateGroupDetailsRequest) => GroupEditService.updateDetails(request),
	);

	ipcMain.handle(
		IpcChannels.GroupSaveEdit,
		(_event, request: SaveGroupEditRequest) => GroupEditService.saveEdit(request),
	);

	ipcMain.handle(
		IpcChannels.GroupGetImageGallery,
		(_event, group: GroupRef) => ImageGalleryService.getGroupImageGallery(group),
	);

	ipcMain.handle(
		IpcChannels.GroupUploadImageGalleryImage,
		(_event, request: UploadGroupImageGalleryImageRequest) => ImageGalleryService.uploadGroupImage(
			request.group,
			request.role,
			request.sourceImagePath,
		),
	);

	ipcMain.handle(
		IpcChannels.GroupSaveImageGallery,
		(_event, request: SaveGroupImageGalleryRequest) => ImageGalleryService.saveGroupImageGallery(request),
	);

	ipcMain.handle(
		IpcChannels.MediaUpdateDetails,
		(_event, request: UpdateMediaDetailsRequest) => MediaEditService.updateDetails(request),
	);

	ipcMain.handle(
		IpcChannels.MediaSaveEdit,
		(_event, request: SaveMediaEditRequest) => MediaEditService.saveEdit(request),
	);

	ipcMain.handle(
		IpcChannels.MediaGetImageGallery,
		(_event, mediaId: number) => ImageGalleryService.getMediaImageGallery(mediaId),
	);

	ipcMain.handle(
		IpcChannels.MediaUploadImageGalleryImage,
		(_event, request: UploadMediaImageGalleryImageRequest) => ImageGalleryService.uploadMediaImage(
			request.mediaId,
			request.role,
			request.sourceImagePath,
		),
	);

	ipcMain.handle(
		IpcChannels.MediaDeleteImageGalleryImage,
		(_event, request: DeleteMediaImageGalleryImageRequest) => ImageGalleryService.deleteMediaUploadedImage(
			request.mediaId,
			request.candidateKey,
		),
	);

	ipcMain.handle(
		IpcChannels.MediaSaveImageGallery,
		(_event, request: SaveMediaImageGalleryRequest) => ImageGalleryService.saveMediaImageGallery(request),
	);

	ipcMain.handle(
		IpcChannels.MediaResetDetails,
		(_event, request: ResetMediaDetailsRequest) => MediaEditService.resetDetails(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeUpdateDetails,
		(_event, request: UpdateEpisodeDetailsRequest) => EpisodeEditService.updateDetails(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeSaveEdit,
		(_event, request: SaveEpisodeEditRequest) => EpisodeEditService.saveEdit(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeResetDetails,
		(_event, request: ResetEpisodeDetailsRequest) => EpisodeEditService.resetDetails(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeGetImageGallery,
		(_event, mediaId: number, episodeNumber: number) => ImageGalleryService.getEpisodeImageGallery(
			mediaId,
			episodeNumber,
		),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeUploadImageGalleryImage,
		(_event, request: UploadEpisodeImageGalleryImageRequest) => ImageGalleryService.uploadEpisodeImage(
			request.mediaId,
			request.episodeNumber,
			request.role,
			request.sourceImagePath,
		),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeSaveImageGallery,
		(_event, request: SaveEpisodeImageGalleryRequest) => ImageGalleryService.saveEpisodeImageGallery(request),
	);
}
