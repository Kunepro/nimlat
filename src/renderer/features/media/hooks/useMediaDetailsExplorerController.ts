import { useMediaDetailsActions } from "./useMediaDetailsActions";
import type { MediaDetailsInspection } from "./useMediaDetailsInspection";
import { useMediaDetailsInspection } from "./useMediaDetailsInspection";

interface MediaDetailsExplorerController {
	errorMessage: string | null;
	isLoading: boolean;
	isRefreshingMetadata: boolean;
	isUpdatingIntegrationStatus: boolean;
	isUpdatingWatchedState: boolean;
	media: MediaDetailsInspection | null;
	editMedia: () => void;
	ignoreMedia: () => Promise<void>;
	openGenreFilter: (genreName: string) => void;
	openTagFilter: (tagName: string) => void;
	refreshMetadata: () => Promise<void>;
	toggleWatched: () => Promise<void>;
}

export function useMediaDetailsExplorerController(): MediaDetailsExplorerController {
	const {
					errorMessage,
					isLoading,
					media,
					numericMediaId,
					refreshMedia,
					updateMedia,
				}           = useMediaDetailsInspection();
	const actionState = useMediaDetailsActions({
		media,
		numericMediaId,
		refreshMedia,
		updateMedia,
	});

	return {
		errorMessage,
		isLoading,
		media,
		...actionState,
	};
}
