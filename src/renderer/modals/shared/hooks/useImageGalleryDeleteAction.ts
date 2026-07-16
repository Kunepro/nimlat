import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	getInitialGallerySelections,
	restoreDeletedGallerySelectionFallback,
} from "../image-gallery-modal.utils";
import type {
	GalleryActionResult,
	GallerySelectionsSetter,
	ImageGalleryTargetGuard,
	LoadImageGallery,
} from "./image-gallery-draft-controller-types";

interface UseImageGalleryDeleteActionOptions<TTarget> {
	deleteImage?: (target: TTarget, candidateKey: string) => Promise<GalleryActionResult>;
	isActive: boolean;
	loadGallery: LoadImageGallery<TTarget>;
	setActiveSelections: GallerySelectionsSetter;
	targetGuard: ImageGalleryTargetGuard<TTarget>;
	targetKey: string | null;
}

interface UseImageGalleryDeleteActionResult {
	deleteCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	isDeletingImage: boolean;
}

// Delete is optional because episode galleries currently upload thumbnails only.
// When the selected upload is removed, the draft falls back to the reloaded default.
export function useImageGalleryDeleteAction<TTarget>({
																											 deleteImage,
																											 isActive,
																											 loadGallery,
																											 setActiveSelections,
																											 targetGuard,
																											 targetKey,
																										 }: UseImageGalleryDeleteActionOptions<TTarget>): UseImageGalleryDeleteActionResult {
	const [ isDeletingImage, setIsDeletingImage ] = useState(false);
	const deleteRequestIdRef                      = useRef(0);
	const {
					isMountedRef,
					isStillEditingTarget,
					latestTargetRef,
				}                                       = targetGuard;

	const isCurrentDeleteRequest = useCallback(
		(requestId: number, activeTarget: TTarget) => requestId === deleteRequestIdRef.current
			&& isStillEditingTarget(activeTarget),
		[ isStillEditingTarget ],
	);

	useEffect(
		() => {
			deleteRequestIdRef.current += 1;
			setIsDeletingImage(false);
		},
		[
			isActive,
			targetKey,
		],
	);

	const deleteCandidate = useCallback(
		(role: ImageGalleryRole, candidateKey: string) => {
			const activeTarget = latestTargetRef.current;
			if (!deleteImage || activeTarget == null) {
				return;
			}

			deleteRequestIdRef.current += 1;
			const requestId = deleteRequestIdRef.current;
			void (async () => {
				try {
					setIsDeletingImage(true);
					const deleteResult = await deleteImage(
						activeTarget,
						candidateKey,
					);
					if (!deleteResult.success || !isCurrentDeleteRequest(
						requestId,
						activeTarget,
					)) {
						return;
					}

					const nextTabs = await loadGallery(activeTarget);
					if (nextTabs == null || !isCurrentDeleteRequest(
						requestId,
						activeTarget,
					)) {
						return;
					}
					const nextDefaults = getInitialGallerySelections(nextTabs);
					setActiveSelections((current) => restoreDeletedGallerySelectionFallback(
						current,
						nextDefaults,
						role,
						candidateKey,
					));
				} finally {
					if (isMountedRef.current && requestId === deleteRequestIdRef.current) {
						setIsDeletingImage(false);
					}
				}
			})();
		},
		[
			deleteImage,
			isCurrentDeleteRequest,
			isMountedRef,
			latestTargetRef,
			loadGallery,
			setActiveSelections,
		],
	);

	return {
		deleteCandidate,
		isDeletingImage,
	};
}
