import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGallerySelectionInput } from "@nimlat/types/ipc-payloads";
import type { EditMediaGallerySelections } from "./edit-media-modal-types";

// Media edits can choose portrait/banner artwork. Thumbnail candidates are derived
// elsewhere and intentionally stay outside this modal's save payload.
export function buildMediaEditImageSelections(
	selections: EditMediaGallerySelections,
): ImageGallerySelectionInput[] {
	return [
		{
			role:         "portrait",
			candidateKey: selections.portrait,
		},
		{
			role:         "banner",
			candidateKey: selections.banner,
		},
	];
}

export function isMediaImageUploadRole(role: ImageGalleryRole): role is Exclude<ImageGalleryRole, "thumbnail"> {
	return role !== "thumbnail";
}
