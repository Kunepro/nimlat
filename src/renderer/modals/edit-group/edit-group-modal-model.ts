import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGallerySelectionInput } from "@nimlat/types/ipc-payloads";
import type { EditGroupGallerySelections } from "./edit-group-modal-types";

// Group edits persist only the user-selectable hero artwork roles.
// Thumbnail state remains a derived gallery concern and must not leak into saveGroupEdit.
export function buildGroupEditImageSelections(
	selections: EditGroupGallerySelections,
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

export function isGroupImageUploadRole(role: ImageGalleryRole): role is Exclude<ImageGalleryRole, "thumbnail"> {
	return role !== "thumbnail";
}
