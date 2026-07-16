import type { IntegrationStatus } from "@nimlat/types/anime-db";
import { GroupExplorerFacade } from "../../facades";
import type { MediaHeaderPlaybackIssueSavePayload } from "./media-layout-model";

// Header controls are optimistic, but persistence remains DB-backed through the
// group explorer facade so renderer state does not become a competing source of truth.
export function persistMediaHeaderTrackingStatus(mediaId: number, integrationStatus: IntegrationStatus | null) {
	return GroupExplorerFacade.setMediaIntegrationStatus({
		mediaId,
		integrationStatus: integrationStatus ?? null,
	});
}

export function persistMediaHeaderPlaybackIssueState(mediaId: number, payload: MediaHeaderPlaybackIssueSavePayload) {
	return GroupExplorerFacade.saveMediaIntegrationState({
		...payload,
		integrationStatus: payload.integrationStatus ?? null,
		mediaId,
	});
}
