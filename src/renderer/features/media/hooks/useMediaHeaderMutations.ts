import type { IntegrationStatus } from "@nimlat/types/anime-db";
import { useCallback } from "react";
import {
	persistMediaHeaderPlaybackIssueState,
	persistMediaHeaderTrackingStatus,
} from "../media-header-mutations-runner";
import type {
	MediaHeaderPlaybackIssueSavePayload,
	MediaLayoutPlaybackIssueState,
} from "../media-layout-model";
import { createMediaHeaderPlaybackIssuePatch } from "../media-layout-model";

interface MediaHeaderMutationsInput {
	mediaId: string;
	setHeaderIntegrationStatus: (status: IntegrationStatus | null) => void;
	setHeaderPlaybackIssueState: (state: Partial<MediaLayoutPlaybackIssueState>) => void;
}

interface MediaHeaderMutations {
	handleHeaderPlaybackIssueSave: (payload: MediaHeaderPlaybackIssueSavePayload) => Promise<void>;
	handleHeaderTrackingStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

// The hook owns React state mirroring only; facade payload construction stays in
// the media header runner so persistence behavior remains testable outside React.
export function useMediaHeaderMutations({
																					mediaId,
																					setHeaderIntegrationStatus,
																					setHeaderPlaybackIssueState,
																				}: MediaHeaderMutationsInput): MediaHeaderMutations {
	const handleHeaderTrackingStatusChange = useCallback(
		async (nextIntegrationStatus: IntegrationStatus | null) => {
			await persistMediaHeaderTrackingStatus(
				Number(mediaId),
				nextIntegrationStatus,
			);
			setHeaderIntegrationStatus(nextIntegrationStatus ?? null);
		},
		[
			mediaId,
			setHeaderIntegrationStatus,
		],
	);

	const handleHeaderPlaybackIssueSave = useCallback(
		async (payload: MediaHeaderPlaybackIssueSavePayload) => {
			await persistMediaHeaderPlaybackIssueState(
				Number(mediaId),
				payload,
			);
			setHeaderIntegrationStatus(payload.integrationStatus ?? null);
			setHeaderPlaybackIssueState(createMediaHeaderPlaybackIssuePatch(payload));
		},
		[
			mediaId,
			setHeaderIntegrationStatus,
			setHeaderPlaybackIssueState,
		],
	);

	return {
		handleHeaderPlaybackIssueSave,
		handleHeaderTrackingStatusChange,
	};
}
