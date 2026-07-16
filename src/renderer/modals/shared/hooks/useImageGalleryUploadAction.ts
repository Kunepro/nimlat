import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { selectGalleryCandidate } from "../image-gallery-modal.utils";
import type {
	GallerySelectionsSetter,
	GalleryUploadResult,
	ImageGalleryTargetGuard,
	LoadImageGallery,
	PickImageResult,
} from "./image-gallery-draft-controller-types";

interface UseImageGalleryUploadActionOptions<TTarget, TUploadRole extends ImageGalleryRole> {
	isActive: boolean;
	isUploadRole: (role: ImageGalleryRole) => role is TUploadRole;
	loadGallery: LoadImageGallery<TTarget>;
	pickImage: () => Promise<PickImageResult>;
	setActiveSelections: GallerySelectionsSetter;
	targetGuard: ImageGalleryTargetGuard<TTarget>;
	targetKey: string | null;
	uploadImage: (target: TTarget, role: TUploadRole, sourceImagePath: string) => Promise<GalleryUploadResult>;
}

interface UseImageGalleryUploadActionResult<TUploadRole extends ImageGalleryRole> {
	uploadImage: (role: ImageGalleryRole) => void;
	uploadingRole: TUploadRole | null;
}

// Upload persists immediately, then reloads the DB-backed gallery and locally
// selects the new candidate so the outer edit form can save the desired active role.
export function useImageGalleryUploadAction<TTarget, TUploadRole extends ImageGalleryRole>({
																																														 isActive,
																																														 isUploadRole,
																																														 loadGallery,
																																														 pickImage,
																																														 setActiveSelections,
																																														 targetGuard,
																																														 targetKey,
																																														 uploadImage: uploadTargetImage,
																																													 }: UseImageGalleryUploadActionOptions<TTarget, TUploadRole>): UseImageGalleryUploadActionResult<TUploadRole> {
	const [ uploadingRole, setUploadingRole ] = useState<TUploadRole | null>(null);
	const uploadRequestIdRef                  = useRef(0);
	const {
					isMountedRef,
					isStillEditingTarget,
					latestTargetRef,
				}                                   = targetGuard;

	const isCurrentUploadRequest = useCallback(
		(requestId: number, activeTarget: TTarget) => requestId === uploadRequestIdRef.current
			&& isStillEditingTarget(activeTarget),
		[ isStillEditingTarget ],
	);

	useEffect(
		() => {
			uploadRequestIdRef.current += 1;
			setUploadingRole(null);
		},
		[
			isActive,
			targetKey,
		],
	);

	const uploadImage = useCallback(
		(role: ImageGalleryRole) => {
			const activeTarget = latestTargetRef.current;
			if (activeTarget == null || !isUploadRole(role)) {
				return;
			}

			uploadRequestIdRef.current += 1;
			const requestId = uploadRequestIdRef.current;
			void (async () => {
				try {
					setUploadingRole(role);
					const pickResult = await pickImage();
					if (!pickResult.success || !isCurrentUploadRequest(
						requestId,
						activeTarget,
					)) {
						return;
					}
					const uploadResult = await uploadTargetImage(
						activeTarget,
						role,
						pickResult.imagePath,
					);
					if (!uploadResult.success || !isCurrentUploadRequest(
						requestId,
						activeTarget,
					)) {
						return;
					}
					const nextTabs = await loadGallery(activeTarget);
					if (nextTabs == null || !isCurrentUploadRequest(
						requestId,
						activeTarget,
					)) {
						return;
					}
					setActiveSelections((current) => selectGalleryCandidate(
						current,
						role,
						uploadResult.candidateKey,
					));
				} finally {
					if (isMountedRef.current && requestId === uploadRequestIdRef.current) {
						setUploadingRole(null);
					}
				}
			})();
		},
		[
			isCurrentUploadRequest,
			isMountedRef,
			isUploadRole,
			latestTargetRef,
			loadGallery,
			pickImage,
			setActiveSelections,
			uploadTargetImage,
		],
	);

	return {
		uploadImage,
		uploadingRole,
	};
}
