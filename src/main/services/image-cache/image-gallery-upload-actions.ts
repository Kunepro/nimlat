import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type {
	SaveImageGalleryActionResult,
	UploadImageGalleryImageActionResult,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { Toaster } from "../../utils/toaster";
import {
	createEpisodeDisplayTarget,
	createGroupDisplayTarget,
	createMediaDisplayTarget,
	publishImageDisplayTargetChanged,
} from "./image-gallery-events";
import {
	createEpisodeOwnerTarget,
	createGroupOwnerTarget,
	createMediaOwnerTarget,
} from "./image-gallery-owner-targets";
import {
	createUploadedImageGalleryCandidate,
	deleteUploadedImageGalleryCandidate,
} from "./image-gallery-upload-store";

export function uploadMediaImage(mediaId: number, role: ImageGalleryRole, sourceImagePath: string): UploadImageGalleryImageActionResult {
	try {
		const candidateKey = createUploadedImageGalleryCandidate(
			createMediaOwnerTarget(mediaId),
			role,
			sourceImagePath,
		);
		publishImageDisplayTargetChanged(
			createMediaDisplayTarget(mediaId),
			"gallery-upload-changed",
		);
		return {
			success: true,
			candidateKey,
		};
	} catch (error) {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"image-gallery.upload-media-image",
			typedError,
			{
				mediaId,
				role,
			},
		);
		Toaster.error("Failed to upload media image.");
		return {
			success: false,
			error:   typedError.message,
		};
	}
}

export function deleteMediaUploadedImage(mediaId: number, candidateKey: string): SaveImageGalleryActionResult {
	try {
		deleteUploadedImageGalleryCandidate(
			createMediaOwnerTarget(mediaId),
			candidateKey,
		);
		publishImageDisplayTargetChanged(
			createMediaDisplayTarget(mediaId),
			"gallery-upload-changed",
		);
		return { success: true };
	} catch (error) {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"image-gallery.delete-media-uploaded-image",
			typedError,
			{
				mediaId,
				candidateKey,
			},
		);
		Toaster.error("Failed to delete uploaded media image.");
		return {
			success: false,
			error:   typedError.message,
		};
	}
}

export function uploadGroupImage(group: GroupRef, role: ImageGalleryRole, sourceImagePath: string): UploadImageGalleryImageActionResult {
	try {
		const candidateKey = createUploadedImageGalleryCandidate(
			createGroupOwnerTarget(group),
			role,
			sourceImagePath,
		);
		publishImageDisplayTargetChanged(
			createGroupDisplayTarget(group),
			"gallery-upload-changed",
		);
		return {
			success: true,
			candidateKey,
		};
	} catch (error) {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"image-gallery.upload-group-image",
			typedError,
			{
				group,
				role,
			},
		);
		Toaster.error("Failed to upload group image.");
		return {
			success: false,
			error:   typedError.message,
		};
	}
}

export function uploadEpisodeImage(
	mediaId: number,
	episodeNumber: number,
	role: ImageGalleryRole,
	sourceImagePath: string,
): UploadImageGalleryImageActionResult {
	try {
		const candidateKey = createUploadedImageGalleryCandidate(
			createEpisodeOwnerTarget(
				mediaId,
				episodeNumber,
			),
			role,
			sourceImagePath,
		);
		publishImageDisplayTargetChanged(
			createEpisodeDisplayTarget(mediaId),
			"gallery-upload-changed",
		);
		return {
			success: true,
			candidateKey,
		};
	} catch (error) {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"image-gallery.upload-episode-image",
			typedError,
			{
				mediaId,
				episodeNumber,
				role,
			},
		);
		Toaster.error("Failed to upload episode image.");
		return {
			success: false,
			error:   typedError.message,
		};
	}
}
