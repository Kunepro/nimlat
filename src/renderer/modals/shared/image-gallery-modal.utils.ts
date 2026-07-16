import { ImageGalleryRole } from "@nimlat/types/anime-db";
import { ImageGalleryTab } from "@nimlat/types/ipc-payloads";

export const EMPTY_GALLERY_SELECTIONS: Record<ImageGalleryRole, string | undefined> = {
	portrait:  undefined,
	banner:    undefined,
	thumbnail: undefined,
};

// Snapshot the currently active candidate per role so the modal can keep editing locally.
export function getInitialGallerySelections(tabs: ImageGalleryTab[]): Record<ImageGalleryRole, string | undefined> {
	return {
		portrait:  tabs.find((tab) => tab.role === "portrait")?.activeCandidateKey,
		banner:    tabs.find((tab) => tab.role === "banner")?.activeCandidateKey,
		thumbnail: tabs.find((tab) => tab.role === "thumbnail")?.activeCandidateKey,
	};
}

// Rebind active selections onto the last persisted gallery snapshot.
// Upload rows are already persisted immediately, so the modal only needs local active-selection state.
export function mergeGalleryTabs(
	baseTabs: ImageGalleryTab[] | undefined,
	selections: Record<ImageGalleryRole, string | undefined>,
): ImageGalleryTab[] {
	return (baseTabs ?? [
		{
			role:               "portrait" as const,
			title:              "Portrait",
			activeCandidateKey: undefined,
			candidates:         [],
		},
		{
			role:               "banner" as const,
			title:              "Banner",
			activeCandidateKey: undefined,
			candidates:         [],
		},
		{
			role:               "thumbnail" as const,
			title:              "Thumbnail",
			activeCandidateKey: undefined,
			candidates:         [],
		},
	]).map((tab) => ({
		...tab,
		activeCandidateKey: selections[ tab.role ],
	}));
}

export function formatImageGalleryError(error: unknown, fallbackMessage: string): string {
	return error instanceof Error && error.message.trim().length > 0
		? error.message
		: fallbackMessage;
}

export function selectGalleryCandidate(
	currentSelections: Record<ImageGalleryRole, string | undefined>,
	role: ImageGalleryRole,
	candidateKey: string,
): Record<ImageGalleryRole, string | undefined> {
	return {
		...currentSelections,
		[ role ]: candidateKey,
	};
}

export function restoreDeletedGallerySelectionFallback(
	currentSelections: Record<ImageGalleryRole, string | undefined>,
	defaultSelections: Record<ImageGalleryRole, string | undefined>,
	role: ImageGalleryRole,
	deletedCandidateKey: string,
): Record<ImageGalleryRole, string | undefined> {
	return {
		...defaultSelections,
		[ role ]: currentSelections[ role ] === deletedCandidateKey
								? defaultSelections[ role ]
								: currentSelections[ role ],
	};
}
