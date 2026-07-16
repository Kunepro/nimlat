import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { GroupExplorerFacade } from "../../facades";
import { buildGroupEditImageSelections } from "./edit-group-modal-model";
import type {
	EditGroupFormValues,
	EditGroupGallerySelections,
} from "./edit-group-modal-types";

// Keeps edit-group facade payloads outside React controllers. The modal hook owns
// validation and lifecycle guards; this runner owns command/read request shape.
export function saveGroupEditDraft(
	group: GroupRef,
	values: EditGroupFormValues,
	selections: EditGroupGallerySelections,
) {
	return GroupExplorerFacade.saveGroupEdit({
		group,
		name:        values.name,
		description: values.description,
		selections:  buildGroupEditImageSelections(selections),
	});
}

export async function loadGroupImageGalleryTabs(group: GroupRef) {
	const gallery = await GroupExplorerFacade.getGroupImageGallery(group);
	return gallery.tabs;
}

export function uploadGroupImageGalleryImage(
	group: GroupRef,
	role: Exclude<ImageGalleryRole, "thumbnail">,
	sourceImagePath: string,
) {
	return GroupExplorerFacade.uploadGroupImageGalleryImage({
		group,
		role,
		sourceImagePath,
	});
}

export function pickGroupImageGalleryImage() {
	return GroupExplorerFacade.pickGroupImage();
}
