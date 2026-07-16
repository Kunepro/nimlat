import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import { GroupExplorerFacade } from "../../facades";
import { buildMediaEditImageSelections } from "./edit-media-modal-model";
import type {
	EditMediaFormValues,
	EditMediaGallerySelections,
} from "./edit-media-modal-types";

// Keeps edit-media facade payloads outside React controllers. The modal hook owns
// validation and lifecycle guards; this runner owns command/read request shape.
export function saveMediaEditDraft(
	mediaId: number,
	values: EditMediaFormValues,
	selections: EditMediaGallerySelections,
) {
	return GroupExplorerFacade.saveMediaEdit({
		mediaId,
		name:        values.name,
		description: values.description,
		selections:  buildMediaEditImageSelections(selections),
	});
}

export function resetMediaEdit(mediaId: number) {
	return GroupExplorerFacade.resetMediaDetails({ mediaId });
}

export async function loadMediaImageGalleryTabs(mediaId: number) {
	const gallery = await GroupExplorerFacade.getMediaImageGallery(mediaId);
	return gallery.tabs;
}

export function uploadMediaImageGalleryImage(
	mediaId: number,
	role: Exclude<ImageGalleryRole, "thumbnail">,
	sourceImagePath: string,
) {
	return GroupExplorerFacade.uploadMediaImageGalleryImage({
		mediaId,
		role,
		sourceImagePath,
	});
}

export function deleteMediaImageGalleryImage(mediaId: number, candidateKey: string) {
	return GroupExplorerFacade.deleteMediaImageGalleryImage({
		mediaId,
		candidateKey,
	});
}

export function pickMediaImageGalleryImage() {
	return GroupExplorerFacade.pickGroupImage();
}
