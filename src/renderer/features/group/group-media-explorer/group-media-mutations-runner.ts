import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	GroupAssignmentsFacade,
	GroupExplorerFacade,
} from "../../../facades";

// Group-media hooks own UI lifecycle and optimistic wall state. This runner owns
// command payloads for facade calls so IPC wiring remains testable outside React.
export function persistGroupIntegrationStatus(group: GroupRef, integrationStatus: IntegrationStatus | null) {
	return GroupExplorerFacade.setGroupIntegrationStatus({
		group,
		integrationStatus,
	});
}

export function persistGroupMediaIntegrationStatus(mediaId: number, integrationStatus: IntegrationStatus | null) {
	return GroupExplorerFacade.setMediaIntegrationStatus({
		mediaId,
		integrationStatus,
	});
}

export function persistGroupMediaWatchState(mediaId: number, isWatched: boolean) {
	return GroupExplorerFacade.setMediaWatchState({
		mediaIds: [ mediaId ],
		isWatched,
	});
}

export function refreshGroupMediaItem(mediaId: number) {
	return GroupExplorerFacade.refreshMedia(mediaId);
}

export function removeGroupMediaItem(groupId: number, mediaId: number) {
	return GroupAssignmentsFacade.removeMediaManual({
		groupId,
		mediaId,
	});
}

export function restoreGroupMediaItem(groupId: number, mediaId: number) {
	return GroupAssignmentsFacade.assignMediasManual({
		groupId,
		mediaIds: [ mediaId ],
	});
}
