import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	MediaEpisodeInspectionRow,
	MediaInspectionData,
} from "@nimlat/types/ipc-payloads";
import { useParams } from "@tanstack/react-router";
import {
	useCallback,
	useMemo,
} from "react";
import { useOpenEditEpisodeModal } from "../../../../modals/edit-episode/edit-episode-modal.state";
import {
	getEmptyEpisodeMessage,
	getEpisodeEditInitialDescription,
	getEpisodeNumberList,
	hasPartialEpisodeList as resolveHasPartialEpisodeList,
	isEpisodeUpdateStatusActive,
	sortMediaEpisodes,
} from "../media-episodes-explorer-model";
import {
	type EpisodePlaybackIssueSavePayload,
	useMediaEpisodeMutations,
} from "./useMediaEpisodeMutations";
import { useMediaEpisodeRefreshWatcher } from "./useMediaEpisodeRefreshWatcher";
import { useMediaEpisodeSelection } from "./useMediaEpisodeSelection";
import { useMediaEpisodesInspection } from "./useMediaEpisodesInspection";

interface MediaEpisodesExplorerController {
	mediaId: string;
	mediaIdNumber: number;
	media: MediaInspectionData | null;
	episodes: MediaEpisodeInspectionRow[];
	isLoading: boolean;
	errorMessage: string | null;
	isBulkUpdatingEpisodes: boolean;
	isEpisodeUpdateActive: boolean;
	emptyEpisodeMessage: string;
	hasPartialEpisodeList: boolean;
	selectedEpisodeNumbers: ReadonlySet<number>;
	selectedEpisodeNumberList: number[];
	updatingEpisodeNumberSet: ReadonlySet<number>;
	updatingWatchedEpisodeNumberSet: ReadonlySet<number>;
	clearEpisodeSelection: () => void;
	toggleAllEpisodesSelection: () => void;
	editEpisode: (episode: MediaEpisodeInspectionRow) => void;
	handleEpisodeIntegrationStatusChange: (episodeNumber: number, nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	handleEpisodePlaybackIssueSave: (episode: MediaEpisodeInspectionRow, payload: EpisodePlaybackIssueSavePayload) => Promise<void>;
	handleEpisodeRefreshRequested: () => void;
	handleEpisodeSelectionChange: (episodeNumber: number, isSelected: boolean, shouldExtendRange: boolean) => void;
	handleEpisodeWatchedToggle: (episodeNumber: number, nextIsWatched: boolean) => Promise<void>;
	handleSelectedEpisodesIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
	handleSelectedEpisodesWatched: () => Promise<void>;
	retryEpisodesLoad: () => void;
}

export function useMediaEpisodesExplorerController(): MediaEpisodesExplorerController {
	const { mediaId = "" }     = useParams({ strict: false });
	const mediaIdNumber        = Number(mediaId);
	const openEditEpisodeModal = useOpenEditEpisodeModal();
	const {
					media,
					setMedia,
					isLoading,
					errorMessage,
					refreshMedia,
					retryEpisodesLoad,
				}                    = useMediaEpisodesInspection(mediaIdNumber);

	const episodes                          = useMemo(
		() => sortMediaEpisodes(media),
		[ media ],
	);
	const orderedEpisodeNumbers             = useMemo(
		() => getEpisodeNumberList(episodes),
		[ episodes ],
	);
	const isEpisodeUpdateActive             = isEpisodeUpdateStatusActive(media?.episodeUpdatesQueueStatus);
	const emptyEpisodeMessage               = getEmptyEpisodeMessage(
		media,
		isEpisodeUpdateActive,
	);
	const hasPartialEpisodeList             = resolveHasPartialEpisodeList(
		media,
		episodes,
	);
	const {
					selectedEpisodeNumbers,
					selectedEpisodeNumberList,
					clearEpisodeSelection,
					toggleAllEpisodesSelection,
					handleEpisodeSelectionChange,
				}                                 = useMediaEpisodeSelection(orderedEpisodeNumbers);
	const { handleEpisodeRefreshRequested } = useMediaEpisodeRefreshWatcher({
		hasPartialEpisodeList,
		isEpisodeUpdateActive,
		refreshMedia,
	});
	const {
					isBulkUpdatingEpisodes,
					updatingEpisodeNumberSet,
					updatingWatchedEpisodeNumberSet,
					handleEpisodeIntegrationStatusChange,
					handleEpisodePlaybackIssueSave,
					handleEpisodeWatchedToggle,
					handleSelectedEpisodesIntegrationStatusChange,
					handleSelectedEpisodesWatched,
				}                                 = useMediaEpisodeMutations({
		mediaIdNumber,
		episodes,
		selectedEpisodeNumberList,
		setMedia,
	});

	const editEpisode = useCallback(
		(episode: MediaEpisodeInspectionRow) => {
			openEditEpisodeModal({
				mediaId:            episode.mediaId,
				episodeNumber:      episode.episodeNumber,
				initialName:        episode.name || "",
				initialDescription: getEpisodeEditInitialDescription(episode),
			});
		},
		[ openEditEpisodeModal ],
	);

	return {
		mediaId,
		mediaIdNumber,
		media,
		episodes,
		isLoading,
		errorMessage,
		isBulkUpdatingEpisodes,
		isEpisodeUpdateActive,
		emptyEpisodeMessage,
		hasPartialEpisodeList,
		selectedEpisodeNumbers,
		selectedEpisodeNumberList,
		updatingEpisodeNumberSet,
		updatingWatchedEpisodeNumberSet,
		clearEpisodeSelection,
		toggleAllEpisodesSelection,
		editEpisode,
		handleEpisodeIntegrationStatusChange,
		handleEpisodePlaybackIssueSave,
		handleEpisodeRefreshRequested,
		handleEpisodeSelectionChange,
		handleEpisodeWatchedToggle,
		handleSelectedEpisodesIntegrationStatusChange,
		handleSelectedEpisodesWatched,
		retryEpisodesLoad,
	};
}
