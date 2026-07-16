import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	SaveEpisodeImageGalleryRequest,
	SaveGroupImageGalleryRequest,
	SaveImageGalleryActionResult,
	SaveMediaImageGalleryRequest,
} from "@nimlat/types/ipc-payloads";
import { Toaster } from "../../utils/toaster";
import {
	createEpisodeDisplayTarget,
	createGroupDisplayTarget,
	createMediaDisplayTarget,
	publishImageDisplayTargetChanged,
} from "./image-gallery-events";
import {
	applyEpisodeSelections,
	applyGroupSelections,
	applyMediaSelections,
} from "./image-gallery-selection-store";

// Save actions publish image-domain invalidation around the lower-level selection
// store, which remains event-free so edit services can compose rollback-aware flows.
export function saveMediaImageGallery(request: SaveMediaImageGalleryRequest): SaveImageGalleryActionResult {
	try {
		applyMediaSelections(
			request.mediaId,
			request.selections,
		);
		publishImageDisplayTargetChanged(
			createMediaDisplayTarget(request.mediaId),
			"gallery-selection-changed",
		);
		return { success: true };
	} catch (error) {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"image-gallery.save-media-image-gallery",
			typedError,
			{ mediaId: request.mediaId },
		);
		Toaster.error("Failed to save media images.");
		return {
			success: false,
			error:   typedError.message,
		};
	}
}

export function saveEpisodeImageGallery(request: SaveEpisodeImageGalleryRequest): SaveImageGalleryActionResult {
	try {
		applyEpisodeSelections(
			request.mediaId,
			request.episodeNumber,
			request.selections,
		);
		publishImageDisplayTargetChanged(
			createEpisodeDisplayTarget(request.mediaId),
			"gallery-selection-changed",
		);
		return { success: true };
	} catch (error) {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"image-gallery.save-episode-image-gallery",
			typedError,
			{
				mediaId:       request.mediaId,
				episodeNumber: request.episodeNumber,
			},
		);
		Toaster.error("Failed to save episode image.");
		return {
			success: false,
			error:   typedError.message,
		};
	}
}

export function saveGroupImageGallery(request: SaveGroupImageGalleryRequest): SaveImageGalleryActionResult {
	try {
		applyGroupSelections(
			request.group,
			request.selections,
		);
		publishImageDisplayTargetChanged(
			createGroupDisplayTarget(request.group),
			"gallery-selection-changed",
		);
		return { success: true };
	} catch (error) {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"image-gallery.save-group-image-gallery",
			typedError,
			{ group: request.group },
		);
		Toaster.error("Failed to save group images.");
		return {
			success: false,
			error:   typedError.message,
		};
	}
}
