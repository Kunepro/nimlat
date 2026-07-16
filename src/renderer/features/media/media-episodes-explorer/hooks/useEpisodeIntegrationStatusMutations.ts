import type { IntegrationStatus } from "@nimlat/types/anime-db";
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
	persistEpisodeIntegrationStatus,
	persistEpisodeIntegrationStatuses,
} from "../media-episode-mutations-runner";
import {
	createEpisodeIntegrationStatusMap,
	formatEpisodeMutationError,
	patchEpisodeIntegrationStatuses,
	restoreEpisodeIntegrationStatuses,
} from "../media-episodes-explorer-model";
import { useEpisodeNumberBusySet } from "./useEpisodeNumberBusySet";

interface EpisodeIntegrationStatusMutationsOptions {
	mediaIdNumber: number;
	episodes: MediaEpisodeInspectionRow[];
	selectedEpisodeNumberList: number[];
	setMedia: Dispatch<SetStateAction<MediaInspectionData | null>>;
}

interface EpisodeIntegrationStatusMutationsController {
	isBulkUpdatingIntegrationStatuses: boolean;
	updatingEpisodeNumberSet: ReadonlySet<number>;
	handleEpisodeIntegrationStatusChange: (episodeNumber: number, nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	handleSelectedEpisodesIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

export function useEpisodeIntegrationStatusMutations({
																											 mediaIdNumber,
																											 episodes,
																											 selectedEpisodeNumberList,
																											 setMedia,
																										 }: EpisodeIntegrationStatusMutationsOptions): EpisodeIntegrationStatusMutationsController {
	const messageApi                                                                = useAppMessage();
	const {
					episodeNumberSet: updatingEpisodeNumberSet,
					addEpisodeNumbers,
					removeEpisodeNumbers,
				}                                                                         = useEpisodeNumberBusySet();
	const [ isBulkUpdatingIntegrationStatuses, setBulkUpdatingIntegrationStatuses ] = useState(false);

	const handleEpisodeIntegrationStatusChange = useCallback(
		async (
			episodeNumber: number,
			nextIntegrationStatus: IntegrationStatus | null,
		) => {
			const episodeNumbers = [ episodeNumber ];
			try {
				addEpisodeNumbers(episodeNumbers);
				const result = await persistEpisodeIntegrationStatus(
					mediaIdNumber,
					episodeNumber,
					nextIntegrationStatus,
				);
				if (!result.success) {
					throw new Error(result.error);
				}
				setMedia(currentMedia => patchEpisodeIntegrationStatuses(
					currentMedia,
					episodeNumbers,
					nextIntegrationStatus,
				));
			} catch (error) {
				messageApi.error(formatEpisodeMutationError(
					error,
					"Failed to update episode integration status.",
				));
			} finally {
				removeEpisodeNumbers(episodeNumbers);
			}
		},
		[
			addEpisodeNumbers,
			messageApi,
			mediaIdNumber,
			removeEpisodeNumbers,
			setMedia,
		],
	);

	const handleSelectedEpisodesIntegrationStatusChange = useCallback(
		async (nextIntegrationStatus: IntegrationStatus | null) => {
			if (selectedEpisodeNumberList.length === 0) {
				return;
			}

			const previousStatusesByEpisodeNumber = createEpisodeIntegrationStatusMap(episodes);

			setBulkUpdatingIntegrationStatuses(true);
			addEpisodeNumbers(selectedEpisodeNumberList);
			// Bulk updates patch the currently selected snapshot optimistically while
			// retaining previous values for exact rollback if the IPC write fails.
			setMedia(currentMedia => patchEpisodeIntegrationStatuses(
				currentMedia,
				selectedEpisodeNumberList,
				nextIntegrationStatus,
			));

			try {
				const result = await persistEpisodeIntegrationStatuses(
					mediaIdNumber,
					selectedEpisodeNumberList,
					nextIntegrationStatus,
				);

				if (!result.success) {
					throw new Error(result.error);
				}
			} catch (error) {
				setMedia(currentMedia => restoreEpisodeIntegrationStatuses(
					currentMedia,
					selectedEpisodeNumberList,
					previousStatusesByEpisodeNumber,
				));
				messageApi.error(formatEpisodeMutationError(
					error,
					"Failed to update selected episode statuses.",
				));
			} finally {
				removeEpisodeNumbers(selectedEpisodeNumberList);
				setBulkUpdatingIntegrationStatuses(false);
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
		isBulkUpdatingIntegrationStatuses,
		updatingEpisodeNumberSet,
		handleEpisodeIntegrationStatusChange,
		handleSelectedEpisodesIntegrationStatusChange,
	};
}
