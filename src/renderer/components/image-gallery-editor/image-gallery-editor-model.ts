import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type {
	ImageGalleryCandidate,
	ImageGalleryTab,
} from "@nimlat/types/ipc-payloads";

export function getImageGalleryCandidatePreviewUrl(candidate: ImageGalleryCandidate): string | undefined {
	return candidate.displayImageUrl || candidate.imageUrl;
}

export function isImageGalleryCandidateSelected(
	tab: ImageGalleryTab,
	candidate: ImageGalleryCandidate,
): boolean {
	return tab.activeCandidateKey === candidate.candidateKey;
}

export function canDeleteImageGalleryCandidate(
	candidate: ImageGalleryCandidate,
	hasDeleteHandler: boolean,
): boolean {
	return candidate.sourceKind === "user_upload" && hasDeleteHandler;
}

export function getImageGalleryEmptyDescription(tabTitle: string): string {
	return `No ${ tabTitle.toLowerCase() } images available yet.`;
}

export function isPortraitImageGalleryRole(role: ImageGalleryRole): boolean {
	return role === "portrait";
}
