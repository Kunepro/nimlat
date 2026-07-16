import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import {
	EpisodeImageGalleryData,
	GroupImageGalleryData,
	ImageGallerySelectionInput,
	MediaImageGalleryData,
	SaveEpisodeImageGalleryRequest,
	SaveGroupImageGalleryRequest,
	SaveImageGalleryActionResult,
	SaveMediaImageGalleryRequest,
	UploadImageGalleryImageActionResult,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	getEpisodeImageGalleryReadModel,
	getGroupImageGalleryReadModel,
	getMediaImageGalleryReadModel,
} from "./image-gallery-read-model";
import {
	saveEpisodeImageGallery,
	saveGroupImageGallery,
	saveMediaImageGallery,
} from "./image-gallery-selection-actions";
import {
	applyEpisodeSelections,
	applyGroupSelections,
	applyMediaSelections,
	getEpisodeSelectionSnapshot,
	getGroupSelectionSnapshot,
	getMediaSelectionSnapshot,
	resetEpisodeSelections,
	resetMediaSelections,
} from "./image-gallery-selection-store";
import {
	deleteMediaUploadedImage,
	uploadEpisodeImage,
	uploadGroupImage,
	uploadMediaImage,
} from "./image-gallery-upload-actions";

// Main-process read/write service for Plex-style selectable image galleries.
// Provider candidates stay derived from source data; only uploads and active selections are persisted.
export class ImageGalleryService {
	// Snapshot currently active image selections so multi-step edit saves can roll back cleanly
	// if a later metadata write fails.
	public static getGroupSelectionSnapshot(group: GroupRef): ImageGallerySelectionInput[] {
		return getGroupSelectionSnapshot(group);
	}

	// Snapshot the active media portrait/banner selections for rollback-aware edit saves.
	public static getMediaSelectionSnapshot(mediaId: number): ImageGallerySelectionInput[] {
		return getMediaSelectionSnapshot(mediaId);
	}

	// Snapshot the active episode thumbnail selection for rollback-aware edit saves.
	public static getEpisodeSelectionSnapshot(mediaId: number, episodeNumber: number): ImageGallerySelectionInput[] {
		return getEpisodeSelectionSnapshot(
			mediaId,
			episodeNumber,
		);
	}

	public static getMediaImageGallery(mediaId: number): MediaImageGalleryData {
		return getMediaImageGalleryReadModel(mediaId);
	}

	public static getGroupImageGallery(group: GroupRef): GroupImageGalleryData {
		return getGroupImageGalleryReadModel(group);
	}

	public static getEpisodeImageGallery(mediaId: number, episodeNumber: number): EpisodeImageGalleryData {
		return getEpisodeImageGalleryReadModel(
			mediaId,
			episodeNumber,
		);
	}

	public static saveMediaImageGallery(request: SaveMediaImageGalleryRequest): SaveImageGalleryActionResult {
		return saveMediaImageGallery(request);
	}

	public static saveEpisodeImageGallery(request: SaveEpisodeImageGalleryRequest): SaveImageGalleryActionResult {
		return saveEpisodeImageGallery(request);
	}

	public static uploadMediaImage(mediaId: number, role: ImageGalleryRole, sourceImagePath: string): UploadImageGalleryImageActionResult {
		return uploadMediaImage(
			mediaId,
			role,
			sourceImagePath,
		);
	}

	public static deleteMediaUploadedImage(mediaId: number, candidateKey: string): SaveImageGalleryActionResult {
		return deleteMediaUploadedImage(
			mediaId,
			candidateKey,
		);
	}

	public static uploadGroupImage(group: GroupRef, role: ImageGalleryRole, sourceImagePath: string): UploadImageGalleryImageActionResult {
		return uploadGroupImage(
			group,
			role,
			sourceImagePath,
		);
	}

	public static uploadEpisodeImage(
		mediaId: number,
		episodeNumber: number,
		role: ImageGalleryRole,
		sourceImagePath: string,
	): UploadImageGalleryImageActionResult {
		return uploadEpisodeImage(
			mediaId,
			episodeNumber,
			role,
			sourceImagePath,
		);
	}

	public static saveGroupImageGallery(request: SaveGroupImageGalleryRequest): SaveImageGalleryActionResult {
		return saveGroupImageGallery(request);
	}

	public static resetMediaSelections(mediaId: number): void {
		resetMediaSelections(mediaId);
	}

	public static resetEpisodeSelections(mediaId: number, episodeNumber: number): void {
		resetEpisodeSelections(
			mediaId,
			episodeNumber,
		);
	}

	// Persist group image selections without publishing events so callers can compose larger atomic edit flows.
	public static applyGroupSelections(group: GroupRef, selections: ImageGallerySelectionInput[]): void {
		applyGroupSelections(
			group,
			selections,
		);
	}

	// Persist media image selections without publishing events so callers can compose larger atomic edit flows.
	public static applyMediaSelections(mediaId: number, selections: ImageGallerySelectionInput[]): void {
		applyMediaSelections(
			mediaId,
			selections,
		);
	}

	// Persist episode thumbnail selections without publishing events so callers can compose larger atomic edit flows.
	public static applyEpisodeSelections(mediaId: number, episodeNumber: number, selections: ImageGallerySelectionInput[]): void {
		applyEpisodeSelections(
			mediaId,
			episodeNumber,
			selections,
		);
	}

}
