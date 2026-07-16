import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	EMPTY_GALLERY_SELECTIONS,
	formatImageGalleryError,
	getInitialGallerySelections,
	mergeGalleryTabs,
} from "../image-gallery-modal.utils";
import type {
	GallerySelections,
	GallerySelectionsSetter,
	ImageGalleryTargetGuard,
	LoadImageGallery,
} from "./image-gallery-draft-controller-types";

interface UseImageGalleryDraftFeedOptions<TTarget> {
	errorMessage: string;
	isActive: boolean;
	loadGalleryTabs: (target: TTarget) => Promise<ImageGalleryTab[]>;
	targetGuard: ImageGalleryTargetGuard<TTarget>;
	targetKey: string | null;
}

interface UseImageGalleryDraftFeedResult<TTarget> {
	activeSelections: GallerySelections;
	galleryError: string | null;
	isLoadingGallery: boolean;
	loadGallery: LoadImageGallery<TTarget>;
	mergedTabs: ImageGalleryTab[];
	setActiveSelections: GallerySelectionsSetter;
}

// Owns read-side gallery state. Each target/open cycle invalidates earlier loads
// so late responses cannot overwrite the current modal draft.
export function useImageGalleryDraftFeed<TTarget>({
																										errorMessage,
																										isActive,
																										loadGalleryTabs,
																										targetGuard,
																										targetKey,
																									}: UseImageGalleryDraftFeedOptions<TTarget>): UseImageGalleryDraftFeedResult<TTarget> {
	const [ isLoadingGallery, setIsLoadingGallery ] = useState(false);
	const [ galleryError, setGalleryError ]         = useState<string | null>(null);
	const [ galleryTabs, setGalleryTabs ]           = useState<ImageGalleryTab[]>([]);
	const [ activeSelections, setActiveSelections ] = useState<GallerySelections>(EMPTY_GALLERY_SELECTIONS);
	const galleryRequestIdRef                       = useRef(0);
	const {
					isStillEditingTarget,
					latestTargetRef,
				}                                         = targetGuard;

	const resetGalleryState = useCallback(
		() => {
			setGalleryTabs([]);
			setGalleryError(null);
			setActiveSelections(EMPTY_GALLERY_SELECTIONS);
			setIsLoadingGallery(false);
		},
		[],
	);

	const loadGallery = useCallback(
		async (activeTarget: TTarget): Promise<ImageGalleryTab[] | null> => {
			galleryRequestIdRef.current += 1;
			const requestId = galleryRequestIdRef.current;
			setIsLoadingGallery(true);
			setGalleryError(null);

			try {
				const tabs = await loadGalleryTabs(activeTarget);
				if (!isStillEditingTarget(activeTarget) || requestId !== galleryRequestIdRef.current) {
					return null;
				}

				setGalleryTabs(tabs);
				setActiveSelections(getInitialGallerySelections(tabs));
				return tabs;
			} catch (error) {
				if (isStillEditingTarget(activeTarget) && requestId === galleryRequestIdRef.current) {
					setGalleryError(formatImageGalleryError(
						error,
						errorMessage,
					));
				}
				return null;
			} finally {
				if (isStillEditingTarget(activeTarget) && requestId === galleryRequestIdRef.current) {
					setIsLoadingGallery(false);
				}
			}
		},
		[
			errorMessage,
			isStillEditingTarget,
			loadGalleryTabs,
		],
	);

	useEffect(
		() => {
			const activeTarget = latestTargetRef.current;
			if (!isActive || activeTarget == null) {
				galleryRequestIdRef.current += 1;
				resetGalleryState();
				return;
			}

			resetGalleryState();
			void loadGallery(activeTarget);
		},
		[
			isActive,
			latestTargetRef,
			loadGallery,
			resetGalleryState,
			targetKey,
		],
	);

	const mergedTabs = useMemo(
		() => mergeGalleryTabs(
			galleryTabs,
			activeSelections,
		),
		[
			activeSelections,
			galleryTabs,
		],
	);

	return {
		activeSelections,
		galleryError,
		isLoadingGallery,
		loadGallery,
		mergedTabs,
		setActiveSelections,
	};
}
