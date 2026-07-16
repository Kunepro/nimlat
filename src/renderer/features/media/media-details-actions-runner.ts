import { parseIntegrationStatusControlValue } from "@nimlat/constants/integration-status";
import { GroupExplorerFacade } from "../../facades";

// Keeps media-details command payloads out of React hooks. The route hook owns
// user feedback and optimistic UI state; this runner owns facade/IPC wiring.
export function persistIgnoredMediaIntegrationStatus(mediaId: number) {
	return GroupExplorerFacade.setMediaIntegrationStatus({
		mediaId,
		integrationStatus: parseIntegrationStatusControlValue("ignored"),
	});
}

export function refreshMediaMetadata(mediaId: number) {
	return GroupExplorerFacade.refreshMedia(mediaId);
}

export function persistMediaWatchedState(mediaId: number, isWatched: boolean) {
	return GroupExplorerFacade.setMediaWatchState({
		mediaIds: [ mediaId ],
		isWatched,
	});
}
