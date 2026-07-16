import type {
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { PreferredTitleLanguage } from "@nimlat/types/user-config";
import type { Observable } from "rxjs";
import {
	GroupExplorerFacade,
	UserConfigFacade,
} from "../../../facades";

// Event boundary for the group-media route. The hook owns routing scoped
// events into UI reloads; this runner only exposes the facade streams.
export function groupMediaListChanges(): Observable<GroupMediaListChangedEvent> {
	return GroupExplorerFacade.groupMediaListChanges();
}

export function groupMediaItemsPatched(): Observable<GroupMediaItemsPatchedEvent> {
	return GroupExplorerFacade.groupMediaItemsPatched();
}

export function groupMediaPreferredTitleLanguageChanges(): Observable<PreferredTitleLanguage> {
	return UserConfigFacade.preferredTitleLanguageChanges();
}
