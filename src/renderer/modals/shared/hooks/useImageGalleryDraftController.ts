import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import { selectGalleryCandidate } from "../image-gallery-modal.utils";
import type {
	GalleryActionResult,
	GalleryUploadResult,
	PickImageResult,
} from "./image-gallery-draft-controller-types";
import { useImageGalleryDeleteAction } from "./useImageGalleryDeleteAction";
import { useImageGalleryDraftFeed } from "./useImageGalleryDraftFeed";
import { useImageGalleryTargetGuard } from "./useImageGalleryTargetGuard";
import { useImageGalleryUploadAction } from "./useImageGalleryUploadAction";

interface UseImageGalleryDraftControllerOptions<TTarget, TUploadRole extends ImageGalleryRole> {
	errorMessage: string;
	isActive: boolean;
	target: TTarget | null;
	targetKey: string | null;
	isSameTarget: (left: TTarget | null, right: TTarget) => boolean;
	isUploadRole: (role: ImageGalleryRole) => role is TUploadRole;
	loadGalleryTabs: (target: TTarget) => Promise<ImageGalleryTab[]>;
	pickImage: () => Promise<PickImageResult>;
	uploadImage: (target: TTarget, role: TUploadRole, sourceImagePath: string) => Promise<GalleryUploadResult>;
	deleteImage?: (target: TTarget, candidateKey: string) => Promise<GalleryActionResult>;
}

interface UseImageGalleryDraftControllerResult<TUploadRole extends ImageGalleryRole> {
	activeSelections: Record<ImageGalleryRole, string | undefined>;
	deleteCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	galleryError: string | null;
	isDeletingImage: boolean;
	isLoadingGallery: boolean;
	mergedTabs: ImageGalleryTab[];
	selectCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	uploadImage: (role: ImageGalleryRole) => void;
	uploadingRole: TUploadRole | null;
}

// Shared draft-state engine for edit modals with immediate upload persistence
// and modal-local active selections until the outer edit form is saved.
export function useImageGalleryDraftController<TTarget, TUploadRole extends ImageGalleryRole>({
																																																deleteImage,
																																																errorMessage,
																																																isActive,
																																																isSameTarget,
																																																isUploadRole,
																																																loadGalleryTabs,
																																																pickImage,
																																																target,
																																																targetKey,
																																																uploadImage: uploadTargetImage,
																																															}: UseImageGalleryDraftControllerOptions<TTarget, TUploadRole>): UseImageGalleryDraftControllerResult<TUploadRole> {
	const targetGuard = useImageGalleryTargetGuard({
		isActive,
		isSameTarget,
		target,
	});
	const {
					activeSelections,
					galleryError,
					isLoadingGallery,
					loadGallery,
					mergedTabs,
					setActiveSelections,
				}           = useImageGalleryDraftFeed({
		errorMessage,
		isActive,
		loadGalleryTabs,
		targetGuard,
		targetKey,
	});
	const {
					uploadImage,
					uploadingRole,
				}           = useImageGalleryUploadAction({
		isActive,
		isUploadRole,
		loadGallery,
		pickImage,
		setActiveSelections,
		targetGuard,
		targetKey,
		uploadImage: uploadTargetImage,
	});
	const {
					deleteCandidate,
					isDeletingImage,
				}           = useImageGalleryDeleteAction({
		deleteImage,
		isActive,
		loadGallery,
		setActiveSelections,
		targetGuard,
		targetKey,
	});

	const selectCandidate = useCallback(
		(role: ImageGalleryRole, candidateKey: string) => {
			setActiveSelections((current) => selectGalleryCandidate(
				current,
				role,
				candidateKey,
			));
		},
		[ setActiveSelections ],
	);

	return {
		activeSelections,
		deleteCandidate,
		galleryError,
		isDeletingImage,
		isLoadingGallery,
		mergedTabs,
		selectCandidate,
		uploadImage,
		uploadingRole,
	};
}
