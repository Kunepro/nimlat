import {
	useCallback,
	useState,
} from "react";
import { useAppMessage } from "../../../hooks";
import {
	persistIgnoredMediaIntegrationStatus,
	persistMediaWatchedState,
	refreshMediaMetadata,
} from "../media-details-actions-runner";
import { applyMediaDetailsWatchedState } from "../media-details-explorer-model";
import type {
	MediaDetailsInspection,
	UpdateMediaDetailsInspection,
} from "./useMediaDetailsInspection";

interface UseMediaDetailsMutationActionsOptions {
	media: MediaDetailsInspection | null;
	numericMediaId: number;
	refreshMedia: (showLoader?: boolean) => Promise<void>;
	updateMedia: UpdateMediaDetailsInspection;
}

export interface MediaDetailsMutationActions {
	ignoreMedia: () => Promise<void>;
	isRefreshingMetadata: boolean;
	isUpdatingIntegrationStatus: boolean;
	isUpdatingWatchedState: boolean;
	refreshMetadata: () => Promise<void>;
	toggleWatched: () => Promise<void>;
}

// Owns media-details mutations and optimistic UI state. Navigation/modal actions
// live separately so persistence failure handling remains isolated and testable.
export function useMediaDetailsMutationActions({
																								 media,
																								 numericMediaId,
																								 refreshMedia,
																								 updateMedia,
																							 }: UseMediaDetailsMutationActionsOptions): MediaDetailsMutationActions {
	const messageApi                                                      = useAppMessage();
	const [ isUpdatingIntegrationStatus, setIsUpdatingIntegrationStatus ] = useState(false);
	const [ isRefreshingMetadata, setIsRefreshingMetadata ]               = useState(false);
	const [ isUpdatingWatchedState, setIsUpdatingWatchedState ]           = useState(false);

	const ignoreMedia = useCallback(
		async () => {
			try {
				setIsUpdatingIntegrationStatus(true);
				await persistIgnoredMediaIntegrationStatus(numericMediaId);
			} finally {
				setIsUpdatingIntegrationStatus(false);
			}
		},
		[ numericMediaId ],
	);

	const refreshMetadata = useCallback(
		async () => {
			try {
				setIsRefreshingMetadata(true);
				const result = await refreshMediaMetadata(numericMediaId);
				if (result.success) {
					await refreshMedia(false);
				}
			} finally {
				setIsRefreshingMetadata(false);
			}
		},
		[
			numericMediaId,
			refreshMedia,
		],
	);

	const toggleWatched = useCallback(
		async () => {
			if (!media) {
				return;
			}
			const previousWatched = media.isWatched === true;
			const nextWatched     = !previousWatched;
			const targetMediaId   = media.mediaId;

			setIsUpdatingWatchedState(true);
			updateMedia(current => applyMediaDetailsWatchedState(
				current,
				targetMediaId,
				nextWatched,
			));
			try {
				const result = await persistMediaWatchedState(
					targetMediaId,
					nextWatched,
				);
				if (!result.success) {
					throw new Error(result.error);
				}
			} catch (error) {
				updateMedia(current => applyMediaDetailsWatchedState(
					current,
					targetMediaId,
					previousWatched,
				));
				messageApi.error(error instanceof Error ? error.message : "Failed to update watched state.");
			} finally {
				setIsUpdatingWatchedState(false);
			}
		},
		[
			media,
			messageApi,
			updateMedia,
		],
	);

	return {
		ignoreMedia,
		isRefreshingMetadata,
		isUpdatingIntegrationStatus,
		isUpdatingWatchedState,
		refreshMetadata,
		toggleWatched,
	};
}
