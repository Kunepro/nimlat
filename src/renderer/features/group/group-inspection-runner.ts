import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type {
	GroupInspectionSummary,
	GroupListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
import type { Observable } from "rxjs";
import { GroupExplorerFacade } from "../../facades";

// Shared facade boundary for group inspection routes. Hooks keep ownership of
// loading, optimistic state, and error display; this module owns facade payloads.
export function loadGroupInspectionSummary(groupRef: GroupRef): Promise<GroupInspectionSummary | null> {
	return GroupExplorerFacade.getInspectionSummary(groupRef);
}

export function groupInspectionListChanges(): Observable<GroupListChangedEvent> {
	return GroupExplorerFacade.groupListChanges();
}

export function loadGroupReleaseTimeline(groupRef: GroupRef): Promise<GroupReleaseTimelineRow[]> {
	return GroupExplorerFacade.getReleaseTimeline(groupRef);
}

export function persistGroupWatchState(group: GroupRef, isWatched: boolean) {
	return GroupExplorerFacade.setGroupWatchState({
		group,
		isWatched,
	});
}

export function persistGroupIntegrationStatus(group: GroupRef, integrationStatus: IntegrationStatus | null) {
	return GroupExplorerFacade.setGroupIntegrationStatus({
		group,
		integrationStatus,
	});
}
