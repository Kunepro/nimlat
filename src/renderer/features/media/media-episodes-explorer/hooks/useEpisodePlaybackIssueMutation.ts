import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import { persistEpisodePlaybackIssueState } from "../media-episode-mutations-runner";
import type { EpisodePlaybackIssueSavePayload } from "./media-episode-mutations.types";

interface EpisodePlaybackIssueMutationController {
	handleEpisodePlaybackIssueSave: (episode: MediaEpisodeInspectionRow, payload: EpisodePlaybackIssueSavePayload) => Promise<void>;
}

export function useEpisodePlaybackIssueMutation(): EpisodePlaybackIssueMutationController {
	const handleEpisodePlaybackIssueSave = useCallback(
		async (
			episode: MediaEpisodeInspectionRow,
			payload: EpisodePlaybackIssueSavePayload,
		) => {
			await persistEpisodePlaybackIssueState(
				episode,
				payload,
			);
		},
		[],
	);

	return { handleEpisodePlaybackIssueSave };
}
