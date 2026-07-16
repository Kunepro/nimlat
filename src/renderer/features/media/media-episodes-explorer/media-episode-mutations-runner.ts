import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import { GroupExplorerFacade } from "../../../facades";
import type { EpisodePlaybackIssueSavePayload } from "./hooks/media-episode-mutations.types";

// Centralizes episode mutation IPC payloads so React hooks can focus on busy
// flags, optimistic state, and user feedback.
export function persistEpisodeIntegrationStatus(
	mediaId: number,
	episodeNumber: number,
	integrationStatus: IntegrationStatus | null,
) {
	return GroupExplorerFacade.setEpisodeIntegrationStatus({
		mediaId,
		episodeNumber,
		integrationStatus,
	});
}

export function persistEpisodeIntegrationStatuses(
	mediaId: number,
	episodeNumbers: number[],
	integrationStatus: IntegrationStatus | null,
) {
	return GroupExplorerFacade.setEpisodeIntegrationStatuses({
		mediaId,
		episodeNumbers,
		integrationStatus,
	});
}

export function persistEpisodeWatchState(
	mediaId: number,
	episodeNumber: number,
	isWatched: boolean,
) {
	return GroupExplorerFacade.setEpisodeWatchState({
		mediaId,
		episodeNumber,
		isWatched,
	});
}

export function persistEpisodeWatchStates(
	mediaId: number,
	episodeNumbers: number[],
	isWatched: boolean,
) {
	return GroupExplorerFacade.setEpisodeWatchStates({
		mediaId,
		episodeNumbers,
		isWatched,
	});
}

export function persistEpisodePlaybackIssueState(
	episode: MediaEpisodeInspectionRow,
	payload: EpisodePlaybackIssueSavePayload,
) {
	return GroupExplorerFacade.saveEpisodeIntegrationState({
		...payload,
		mediaId:       episode.mediaId,
		episodeNumber: episode.episodeNumber,
	});
}
