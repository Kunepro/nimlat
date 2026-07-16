import type {
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
	MediaInspectionData,
	MediaInspectionOptions,
} from "@nimlat/types/ipc-payloads";
import type { PreferredTitleLanguage } from "@nimlat/types/user-config";
import type { Observable } from "rxjs";
import {
	GroupExplorerFacade,
	UserConfigFacade,
} from "../../facades";

export type MediaInspection = MediaInspectionData;

// Shared read/event surface for media inspection screens. Route hooks decide
// when a payload is stale; this runner only centralizes facade access.
export function getMediaInspection(
	mediaId: number,
	options?: MediaInspectionOptions,
): Promise<MediaInspection | null> {
	return GroupExplorerFacade.getMediaInspection(
		mediaId,
		options,
	);
}

export function groupMediaListChanges(): Observable<GroupMediaListChangedEvent> {
	return GroupExplorerFacade.groupMediaListChanges();
}

export function groupMediaItemsPatched(): Observable<GroupMediaItemsPatchedEvent> {
	return GroupExplorerFacade.groupMediaItemsPatched();
}

export function mediaEpisodesListChanges(): Observable<MediaEpisodesListChangedEvent> {
	return GroupExplorerFacade.mediaEpisodesListChanges();
}

export function mediaEpisodesItemsPatched(): Observable<MediaEpisodesItemsPatchedEvent> {
	return GroupExplorerFacade.mediaEpisodesItemsPatched();
}

export function preferredTitleLanguageChanges(): Observable<PreferredTitleLanguage> {
	return UserConfigFacade.preferredTitleLanguageChanges();
}
