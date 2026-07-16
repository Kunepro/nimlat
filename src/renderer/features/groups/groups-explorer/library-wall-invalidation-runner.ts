import type {
	GroupListChangedEvent,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { PreferredTitleLanguage } from "@nimlat/types/user-config";
import type { Observable } from "rxjs";
import {
	GroupExplorerFacade,
	UserConfigFacade,
} from "../../../facades";

// Event boundary for Library wall invalidation. The hook decides how each
// event affects wall reloads; this runner only exposes the underlying streams.
export function libraryGroupListChanges(): Observable<GroupListChangedEvent> {
	return GroupExplorerFacade.groupListChanges();
}

export function libraryGroupMediaListChanges(): Observable<GroupMediaListChangedEvent> {
	return GroupExplorerFacade.groupMediaListChanges();
}

export function libraryGroupMediaItemsPatched(): Observable<GroupMediaItemsPatchedEvent> {
	return GroupExplorerFacade.groupMediaItemsPatched();
}

export function libraryPreferredTitleLanguageChanges(): Observable<PreferredTitleLanguage> {
	return UserConfigFacade.preferredTitleLanguageChanges();
}
