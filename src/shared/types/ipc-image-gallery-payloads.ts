import type {
	DisplayImageOrientation,
	ImageCandidateSourceKind,
	ImageGalleryRole,
	ResolvedImageSource,
} from "./anime-db-images";
import type {
	GroupRef,
	MediaId,
} from "./nimlat-ids";

// Image gallery payloads intentionally carry candidate keys, not DB row details.
// The main process owns how provider/user-upload selections map to persisted rows.
export interface ImageGalleryCandidate {
	candidateKey: string;
	role: ImageGalleryRole;
	sourceKind: ImageCandidateSourceKind;
	label: string;
	imageUrl?: string;
	displayImageUrl?: string;
	displayImageSource?: ResolvedImageSource;
	displayImageOrientation?: DisplayImageOrientation;
}

export interface ImageGalleryTab {
	role: ImageGalleryRole;
	title: string;
	activeCandidateKey?: string;
	candidates: ImageGalleryCandidate[];
}

export interface GroupImageGalleryData {
	group: GroupRef;
	tabs: ImageGalleryTab[];
}

export interface MediaImageGalleryData {
	mediaId: MediaId;
	tabs: ImageGalleryTab[];
}

export interface EpisodeImageGalleryData {
	mediaId: MediaId;
	episodeNumber: number;
	tabs: ImageGalleryTab[];
}

export interface UploadGroupImageGalleryImageRequest {
	group: GroupRef;
	role: ImageGalleryRole;
	sourceImagePath: string;
}

export interface UploadMediaImageGalleryImageRequest {
	mediaId: MediaId;
	role: ImageGalleryRole;
	sourceImagePath: string;
}

export interface DeleteMediaImageGalleryImageRequest {
	mediaId: MediaId;
	candidateKey: string;
}

export interface UploadEpisodeImageGalleryImageRequest {
	mediaId: MediaId;
	episodeNumber: number;
	role: ImageGalleryRole;
	sourceImagePath: string;
}

export interface ImageGallerySelectionInput {
	role: ImageGalleryRole;
	candidateKey?: string;
}

export interface SaveGroupImageGalleryRequest {
	group: GroupRef;
	selections: ImageGallerySelectionInput[];
}

export interface SaveGroupEditRequest {
	group: GroupRef;
	name: string;
	description?: string;
	selections: ImageGallerySelectionInput[];
}

export interface SaveMediaImageGalleryRequest {
	mediaId: MediaId;
	selections: ImageGallerySelectionInput[];
}

export interface SaveMediaEditRequest {
	mediaId: MediaId;
	name: string;
	description?: string;
	selections: ImageGallerySelectionInput[];
}

export interface SaveEpisodeImageGalleryRequest {
	mediaId: MediaId;
	episodeNumber: number;
	selections: ImageGallerySelectionInput[];
}

export interface SaveEpisodeEditRequest {
	mediaId: MediaId;
	episodeNumber: number;
	name?: string;
	description?: string;
	selections: ImageGallerySelectionInput[];
}

export type SaveImageGalleryActionResult =
	| { success: true }
	| { success: false; error: string };

export type UploadImageGalleryImageActionResult =
	| { success: true; candidateKey: string }
	| { success: false; error: string };
