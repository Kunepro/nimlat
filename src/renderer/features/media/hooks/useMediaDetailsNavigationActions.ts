import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ROUTES } from "../../../constants/route-config";
import { useOpenEditMediaModal } from "../../../modals/edit-media/edit-media-modal.state";
import {
	createGenreLibraryFilterSearch,
	createTagLibraryFilterSearch,
} from "../media-details-explorer-model";
import type { MediaDetailsInspection } from "./useMediaDetailsInspection";

interface UseMediaDetailsNavigationActionsOptions {
	media: MediaDetailsInspection | null;
}

export interface MediaDetailsNavigationActions {
	editMedia: () => void;
	openGenreFilter: (genreName: string) => void;
	openTagFilter: (tagName: string) => void;
}

// Owns non-persistent user actions for media details: route navigation and edit
// modal opening. Keeping this separate avoids coupling modal state to mutations.
export function useMediaDetailsNavigationActions({
																									 media,
																								 }: UseMediaDetailsNavigationActionsOptions): MediaDetailsNavigationActions {
	const navigate           = useNavigate();
	const openEditMediaModal = useOpenEditMediaModal();

	const editMedia = useCallback(
		() => {
			if (!media) {
				return;
			}
			openEditMediaModal({
				mediaId:            media.mediaId,
				initialName:        media.name,
				initialDescription: media.description || "",
			});
		},
		[
			media,
			openEditMediaModal,
		],
	);

	const openGenreFilter = useCallback(
		(genreName: string) => {
			void navigate({
				to:      ROUTES.GROUPS.FULL_URL,
				search:  createGenreLibraryFilterSearch(genreName),
				replace: false,
			});
		},
		[ navigate ],
	);

	const openTagFilter = useCallback(
		(tagName: string) => {
			void navigate({
				to:      ROUTES.GROUPS.FULL_URL,
				search:  createTagLibraryFilterSearch(tagName),
				replace: false,
			});
		},
		[ navigate ],
	);

	return {
		editMedia,
		openGenreFilter,
		openTagFilter,
	};
}
