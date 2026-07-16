import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { useCallback } from "react";
import { useImageGalleryDraftController } from "../../shared/hooks/useImageGalleryDraftController";
import { isGroupImageUploadRole } from "../edit-group-modal-model";
import {
	loadGroupImageGalleryTabs,
	pickGroupImageGalleryImage,
	uploadGroupImageGalleryImage,
} from "../edit-group-modal-runner";
import type { EditGroupGallerySelections } from "../edit-group-modal-types";

interface UseEditGroupImageGalleryControllerInput {
	group: GroupRef;
	isOpen: boolean;
}

interface UseEditGroupImageGalleryControllerResult {
	activeSelections: EditGroupGallerySelections;
	galleryError: string | null;
	isLoadingGallery: boolean;
	mergedTabs: ImageGalleryTab[];
	uploadingRole: Exclude<ImageGalleryRole, "thumbnail"> | null;
	selectCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	uploadImage: (role: ImageGalleryRole) => void;
}

type GroupUploadRole = Exclude<ImageGalleryRole, "thumbnail">;

function isSameGroupRef(
	left: GroupRef | null,
	right: GroupRef,
): boolean {
	return left?.source === right.source && left.groupId === right.groupId;
}

export function useEditGroupImageGalleryController({
																										 group,
																										 isOpen,
																									 }: UseEditGroupImageGalleryControllerInput): UseEditGroupImageGalleryControllerResult {
	const loadGalleryTabs = useCallback(
		(activeGroup: GroupRef) => loadGroupImageGalleryTabs(activeGroup),
		[],
	);
	const uploadImage     = useCallback(
		(activeGroup: GroupRef, role: GroupUploadRole, sourceImagePath: string) => uploadGroupImageGalleryImage(
			activeGroup,
			role,
			sourceImagePath,
		),
		[],
	);
	const pickImage       = useCallback(
		() => pickGroupImageGalleryImage(),
		[],
	);

	const {
					activeSelections,
					galleryError,
					isLoadingGallery,
					mergedTabs,
					selectCandidate,
					uploadImage: uploadSelectedImage,
					uploadingRole,
				} = useImageGalleryDraftController({
		errorMessage: "Failed to load group images.",
		isActive:     isOpen,
		isSameTarget: isSameGroupRef,
		isUploadRole: isGroupImageUploadRole,
		loadGalleryTabs,
		pickImage,
		target:       group,
		targetKey:    `${ group.source }:${ group.groupId }`,
		uploadImage,
	});

	return {
		activeSelections,
		galleryError,
		isLoadingGallery,
		mergedTabs,
		selectCandidate,
		uploadImage: uploadSelectedImage,
		uploadingRole,
	};
}
