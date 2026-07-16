import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGallerySelectionInput } from "@nimlat/types/ipc-payloads";
import type { EditEpisodeGallerySelections } from "./edit-episode-modal-types";

// Episode edits own thumbnail selection only. Portrait/banner roles belong to group/media galleries.
export function buildEpisodeEditImageSelections(
	selections: EditEpisodeGallerySelections,
): ImageGallerySelectionInput[] {
	return [
		{
			role:         "thumbnail",
			candidateKey: selections.thumbnail,
		},
	];
}

export function isEpisodeThumbnailUploadRole(role: ImageGalleryRole): role is "thumbnail" {
	return role === "thumbnail";
}
