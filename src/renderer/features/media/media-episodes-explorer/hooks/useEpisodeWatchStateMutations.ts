import type {
	MediaEpisodeInspectionRow,
	MediaInspectionData,
} from "@nimlat/types/ipc-payloads";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useCallback,
	useState,
} from "react";
import { useAppMessage } from "../../../../hooks";
import {
	persistEpisodeWatchState,
	persistEpisodeWatchStates,
} from "../media-episode-mutations-runner";
import {
	createEpisodeWatchedStateMap,
	formatEpisodeMutationError,
	patchEpisodeWatchedStates,
	restoreEpisodeWatchedStates,
} from "../media-episodes-explorer-model";
import { useEpisodeNumberBusySet } from "./useEpisodeNumberBusySet";

interface EpisodeWatchStateMutationsOptions {
	mediaIdNumber: number;
	episodes: MediaEpisodeInspectionRow[];
	selectedEpisodeNumberList: number[];
	setMedia: Dispatch<SetStateAction<MediaInspectionData | null>>;
}

interface EpisodeWatchStateMutationsController {
	isBulkUpdatingEpisodeWatchStates: boolean;
	updatingWatchedEpisodeNumberSet: ReadonlySet<number>;
	handleEpisodeWatchedToggle: (episodeNumber: number, nextIsWatched: boolean) => Promise<void>;
	handleSelectedEpisodesWatched: () => Promise<void>;
}

export function useEpisodeWatchStateMutations({
																								mediaIdNumber,
																								episodes,
																								selectedEpisodeNumberList,
																								setMedia,
																							}: EpisodeWatchStateMutationsOptions): EpisodeWatchStateMutationsController {
	const messageApi                                                              = useAppMessage();
	const {
					episodeNumberSet: updatingWatchedEpisodeNumberSet,
					addEpisodeNumbers,
					removeEpisodeNumbers,
				}                                                                       = useEpisodeNumberBusySet();
	const [ isBulkUpdatingEpisodeWatchStates, setBulkUpdatingEpisodeWatchStates ] = useState(false);

	const handleEpisodeWatchedToggle = useCallback(
		async (
			episodeNumber: number,
			nextIsWatched: boolean,
		) => {
			const episodeNumbers                 = [ episodeNumber ];
			const previousWatchedByEpisodeNumber = createEpisodeWatchedStateMap(episodes);
			addEpisodeNumbers(episodeNumbers);
			setMedia(currentMedia => patchEpisodeWatchedStates(
				currentMedia,
				episodeNumbers,
				nextIsWatched,
			));

			try {
				const result = await persistEpisodeWatchState(
					mediaIdNumber,
					episodeNumber,
					nextIsWatched,
				);

				if (!result.success) {
					throw new Error(result.error);
				}
			} catch (error) {
				setMedia(currentMedia => restoreEpisodeWatchedStates(
					currentMedia,
					episodeNumbers,
					previousWatchedByEpisodeNumber,
				));
				messageApi.error(formatEpisodeMutationError(
					error,
					"Failed to update episode watched state.",
				));
			} finally {
				removeEpisodeNumbers(episodeNumbers);
			}
		},
		[
			addEpisodeNumbers,
			episodes,
			messageApi,
			mediaIdNumber,
			removeEpisodeNumbers,
			setMedia,
		],
	);

	const handleSelectedEpisodesWatched = useCallback(
		async () => {
			if (selectedEpisodeNumberList.length === 0) {
				return;
			}

			const previousWatchedByEpisodeNumber = createEpisodeWatchedStateMap(episodes);

			setBulkUpdatingEpisodeWatchStates(true);
			addEpisodeNumbers(selectedEpisodeNumberList);
			// Watch-state bulk edits use the same rollback shape as status updates so
			// a partial service failure never leaves the routed snapshot half-optimistic.
			setMedia(currentMedia => patchEpisodeWatchedStates(
				currentMedia,
				selectedEpisodeNumberList,
				true,
			));

			try {
				const result = await persistEpisodeWatchStates(
					mediaIdNumber,
					selectedEpisodeNumberList,
					true,
				);

				if (!result.success) {
					throw new Error(result.error);
				}
			} catch (error) {
				setMedia(currentMedia => restoreEpisodeWatchedStates(
					currentMedia,
					selectedEpisodeNumberList,
					previousWatchedByEpisodeNumber,
				));
				messageApi.error(formatEpisodeMutationError(
					error,
					"Failed to mark selected episodes as watched.",
				));
			} finally {
				removeEpisodeNumbers(selectedEpisodeNumberList);
				setBulkUpdatingEpisodeWatchStates(false);
			}
		},
		[
			addEpisodeNumbers,
			episodes,
			messageApi,
			mediaIdNumber,
			removeEpisodeNumbers,
			selectedEpisodeNumberList,
			setMedia,
		],
	);

	return {
		isBulkUpdatingEpisodeWatchStates,
		updatingWatchedEpisodeNumberSet,
		handleEpisodeWatchedToggle,
		handleSelectedEpisodesWatched,
	};
}
