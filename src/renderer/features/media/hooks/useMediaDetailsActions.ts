import type {
	MediaDetailsInspection,
	UpdateMediaDetailsInspection,
} from "./useMediaDetailsInspection";
import {
	type MediaDetailsMutationActions,
	useMediaDetailsMutationActions,
} from "./useMediaDetailsMutationActions";
import {
	type MediaDetailsNavigationActions,
	useMediaDetailsNavigationActions,
} from "./useMediaDetailsNavigationActions";

interface UseMediaDetailsActionsOptions {
	media: MediaDetailsInspection | null;
	numericMediaId: number;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
	updateMedia: UpdateMediaDetailsInspection;
}

type UseMediaDetailsActionsResult = MediaDetailsMutationActions & MediaDetailsNavigationActions;

// Owns user-triggered actions for the media-details route. Read refresh details
// stay in `useMediaDetailsInspection`; this hook only requests mutations and UI navigation.
export function useMediaDetailsActions({
																				 media,
																				 numericMediaId,
																				 refreshMedia,
																				 updateMedia,
																			 }: UseMediaDetailsActionsOptions): UseMediaDetailsActionsResult {
	const mutationActions   = useMediaDetailsMutationActions({
		media,
		numericMediaId,
		refreshMedia,
		updateMedia,
	});
	const navigationActions = useMediaDetailsNavigationActions({ media });

	return {
		...navigationActions,
		...mutationActions,
	};
}
