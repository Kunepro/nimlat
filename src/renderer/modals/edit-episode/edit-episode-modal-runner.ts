import { GroupExplorerFacade } from "../../facades";
import { buildEpisodeEditImageSelections } from "./edit-episode-modal-model";
import type {
	EditEpisodeFormValues,
	EditEpisodeGallerySelections,
} from "./edit-episode-modal-types";

interface EpisodeEditIdentity {
	episodeNumber: number;
	mediaId: number;
}

// Keeps edit-episode facade payloads outside React controllers. The modal hook
// owns validation and lifecycle guards; this runner owns command/read request shape.
export function saveEpisodeEditDraft(
	identity: EpisodeEditIdentity,
	values: EditEpisodeFormValues,
	selections: EditEpisodeGallerySelections,
) {
	return GroupExplorerFacade.saveEpisodeEdit({
		mediaId:       identity.mediaId,
		episodeNumber: identity.episodeNumber,
		description: values.description,
		name:          values.name,
		selections:    buildEpisodeEditImageSelections(selections),
	});
}

export function resetEpisodeEdit(identity: EpisodeEditIdentity) {
	return GroupExplorerFacade.resetEpisodeDetails(identity);
}

export async function loadEpisodeImageGalleryTabs(identity: EpisodeEditIdentity) {
	const gallery = await GroupExplorerFacade.getEpisodeImageGallery(
		identity.mediaId,
		identity.episodeNumber,
	);
	return gallery.tabs;
}

export function uploadEpisodeThumbnailImage(identity: EpisodeEditIdentity, sourceImagePath: string) {
	return GroupExplorerFacade.uploadEpisodeImageGalleryImage({
		mediaId:       identity.mediaId,
		episodeNumber: identity.episodeNumber,
		role:          "thumbnail",
		sourceImagePath,
	});
}

export function pickEpisodeImageGalleryImage() {
	return GroupExplorerFacade.pickGroupImage();
}
