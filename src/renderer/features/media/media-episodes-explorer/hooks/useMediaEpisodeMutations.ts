import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	MediaEpisodeInspectionRow,
	MediaInspectionData,
} from "@nimlat/types/ipc-payloads";
import type {
	Dispatch,
	SetStateAction,
} from "react";
import type { EpisodePlaybackIssueSavePayload } from "./media-episode-mutations.types";
import { useEpisodeIntegrationStatusMutations } from "./useEpisodeIntegrationStatusMutations";
import { useEpisodePlaybackIssueMutation } from "./useEpisodePlaybackIssueMutation";
import { useEpisodeWatchStateMutations } from "./useEpisodeWatchStateMutations";

export type { EpisodePlaybackIssueSavePayload } from "./media-episode-mutations.types";

interface MediaEpisodeMutationsOptions {
	mediaIdNumber: number;
	episodes: MediaEpisodeInspectionRow[];
	selectedEpisodeNumberList: number[];
	setMedia: Dispatch<SetStateAction<MediaInspectionData | null>>;
}

interface MediaEpisodeMutationsController {
	isBulkUpdatingEpisodes: boolean;
	updatingEpisodeNumberSet: ReadonlySet<number>;
	updatingWatchedEpisodeNumberSet: ReadonlySet<number>;
	handleEpisodeIntegrationStatusChange: (episodeNumber: number, nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	handleEpisodePlaybackIssueSave: (episode: MediaEpisodeInspectionRow, payload: EpisodePlaybackIssueSavePayload) => Promise<void>;
	handleEpisodeWatchedToggle: (episodeNumber: number, nextIsWatched: boolean) => Promise<void>;
	handleSelectedEpisodesIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	handleSelectedEpisodesWatched: () => Promise<void>;
}

export function useMediaEpisodeMutations({
																					 mediaIdNumber,
																					 episodes,
																					 selectedEpisodeNumberList,
																					 setMedia,
																				 }: MediaEpisodeMutationsOptions): MediaEpisodeMutationsController {
	const {
					isBulkUpdatingIntegrationStatuses,
					updatingEpisodeNumberSet,
					handleEpisodeIntegrationStatusChange,
					handleSelectedEpisodesIntegrationStatusChange,
				} = useEpisodeIntegrationStatusMutations({
		mediaIdNumber,
		episodes,
		selectedEpisodeNumberList,
		setMedia,
	});
	const {
					isBulkUpdatingEpisodeWatchStates,
					updatingWatchedEpisodeNumberSet,
					handleEpisodeWatchedToggle,
					handleSelectedEpisodesWatched,
				} = useEpisodeWatchStateMutations({
		mediaIdNumber,
		episodes,
		selectedEpisodeNumberList,
		setMedia,
	});
	const {
					handleEpisodePlaybackIssueSave,
				} = useEpisodePlaybackIssueMutation();

	return {
		isBulkUpdatingEpisodes: isBulkUpdatingIntegrationStatuses || isBulkUpdatingEpisodeWatchStates,
		updatingEpisodeNumberSet,
		updatingWatchedEpisodeNumberSet,
		handleEpisodeIntegrationStatusChange,
		handleEpisodePlaybackIssueSave,
		handleEpisodeWatchedToggle,
		handleSelectedEpisodesIntegrationStatusChange,
		handleSelectedEpisodesWatched,
	};
}
