import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import { useImageGalleryDraftController } from "../../shared/hooks/useImageGalleryDraftController";
import { isMediaImageUploadRole } from "../edit-media-modal-model";
import {
	deleteMediaImageGalleryImage,
	loadMediaImageGalleryTabs,
	pickMediaImageGalleryImage,
	uploadMediaImageGalleryImage,
} from "../edit-media-modal-runner";
import type { EditMediaGallerySelections } from "../edit-media-modal-types";

interface UseEditMediaImageGalleryControllerInput {
	isOpen: boolean;
	mediaId: number | null;
}

interface UseEditMediaImageGalleryControllerResult {
	activeSelections: EditMediaGallerySelections;
	galleryError: string | null;
	isDeletingImage: boolean;
	isLoadingGallery: boolean;
	mergedTabs: ImageGalleryTab[];
	uploadingRole: Exclude<ImageGalleryRole, "thumbnail"> | null;
	deleteCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	selectCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	uploadImage: (role: ImageGalleryRole) => void;
}

type MediaImageUploadRole = Exclude<ImageGalleryRole, "thumbnail">;

function isSameMediaId(
	left: number | null,
	right: number,
): boolean {
	return left === right;
}

export function useEditMediaImageGalleryController({
																										 isOpen,
																										 mediaId,
																									 }: UseEditMediaImageGalleryControllerInput): UseEditMediaImageGalleryControllerResult {
	const loadGalleryTabs = useCallback(
		(activeMediaId: number) => loadMediaImageGalleryTabs(activeMediaId),
		[],
	);
	const uploadImage     = useCallback(
		(activeMediaId: number, role: MediaImageUploadRole, sourceImagePath: string) => uploadMediaImageGalleryImage(
			activeMediaId,
			role,
			sourceImagePath,
		),
		[],
	);
	const deleteImage     = useCallback(
		(activeMediaId: number, candidateKey: string) => deleteMediaImageGalleryImage(
			activeMediaId,
			candidateKey,
		),
		[],
	);
	const pickImage       = useCallback(
		() => pickMediaImageGalleryImage(),
		[],
	);

	const controller = useImageGalleryDraftController({
		deleteImage,
		errorMessage: "Failed to load media images.",
		isActive:     isOpen && mediaId != null,
		isSameTarget: isSameMediaId,
		isUploadRole: isMediaImageUploadRole,
		loadGalleryTabs,
		pickImage,
		target:       mediaId,
		targetKey:    mediaId == null ? null : mediaId.toString(),
		uploadImage,
	});

	return {
		...controller,
		activeSelections: controller.activeSelections,
	};
}
