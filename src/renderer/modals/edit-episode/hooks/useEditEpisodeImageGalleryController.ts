import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useMemo,
} from "react";
import { useImageGalleryDraftController } from "../../shared/hooks/useImageGalleryDraftController";
import { isEpisodeThumbnailUploadRole } from "../edit-episode-modal-model";
import {
	loadEpisodeImageGalleryTabs,
	pickEpisodeImageGalleryImage,
	uploadEpisodeThumbnailImage,
} from "../edit-episode-modal-runner";
import type { EditEpisodeGallerySelections } from "../edit-episode-modal-types";

interface EpisodeIdentity {
	episodeNumber: number;
	mediaId: number;
}

interface UseEditEpisodeImageGalleryControllerInput {
	episodeNumber: number | null;
	isOpen: boolean;
	mediaId: number | null;
}

interface UseEditEpisodeImageGalleryControllerResult {
	activeSelections: EditEpisodeGallerySelections;
	galleryError: string | null;
	isLoadingGallery: boolean;
	thumbnailTabs: ImageGalleryTab[];
	uploadingRole: "thumbnail" | null;
	selectThumbnail: (candidateKey: string) => void;
	uploadThumbnail: () => void;
}

function isSameEpisodeIdentity(
	left: EpisodeIdentity | null,
	right: EpisodeIdentity,
): boolean {
	return left?.mediaId === right.mediaId && left.episodeNumber === right.episodeNumber;
}

export function useEditEpisodeImageGalleryController({
																											 episodeNumber,
																											 isOpen,
																											 mediaId,
																										 }: UseEditEpisodeImageGalleryControllerInput): UseEditEpisodeImageGalleryControllerResult {
	const target      = useMemo(
		() => mediaId != null && episodeNumber != null
			? {
				episodeNumber,
				mediaId,
			}
			: null,
		[
			episodeNumber,
			mediaId,
		],
	);
	const uploadImage = useCallback(
		(identity: EpisodeIdentity, _role: "thumbnail", sourceImagePath: string) => uploadEpisodeThumbnailImage(
			identity,
			sourceImagePath,
		),
		[],
	);
	const pickImage   = useCallback(
		() => pickEpisodeImageGalleryImage(),
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
				}               = useImageGalleryDraftController({
		errorMessage: "Failed to load episode image.",
		isActive:     isOpen && target != null,
		isSameTarget: isSameEpisodeIdentity,
		isUploadRole: isEpisodeThumbnailUploadRole,
		loadGalleryTabs: loadEpisodeImageGalleryTabs,
		pickImage,
		target,
		targetKey:    target ? `${ target.mediaId }:${ target.episodeNumber }` : null,
		uploadImage,
	});
	const thumbnailTabs   = useMemo(
		() => mergedTabs.filter((tab) => tab.role === "thumbnail"),
		[ mergedTabs ],
	);
	const uploadThumbnail = useCallback(
		() => {
			uploadSelectedImage("thumbnail");
		},
		[ uploadSelectedImage ],
	);
	const selectThumbnail = useCallback(
		(candidateKey: string) => {
			selectCandidate(
				"thumbnail",
				candidateKey,
			);
		},
		[ selectCandidate ],
	);

	return {
		activeSelections,
		galleryError,
		isLoadingGallery,
		selectThumbnail,
		thumbnailTabs,
		uploadingRole,
		uploadThumbnail,
	};
}
