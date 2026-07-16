import {
	BUS_GroupListChanged,
	BUS_GroupMediaListChanged,
} from "@nimlat/busses/main";
import { UserDbFacade } from "@nimlat/database";
import type { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { LibrarySideEffectsCoordinator } from "../library/library-side-effects-coordinator";

// Grouping writes must publish one consistent side-effect shape so renderer caches
// and aggregate tracking snapshots cannot drift apart.
export function publishUserGroupingMutation(result: GroupingMutationImpactDto, context: string): void {
	const affectedGroups = result.affectedGroupIds.map(createUserGroupRef);
	recomputeGroupIntegrationSnapshots(affectedGroups);
	LibrarySideEffectsCoordinator.handleGroupingMutation({
		affectedMediaIds: result.affectedMediaIds,
		affectedGroups,
		context,
	});
}

export function publishOfficialGroupingMutation(result: GroupingMutationImpactDto, shouldRefreshGroupList: boolean): void {
	const affectedGroups = result.affectedGroupIds.map(createOfficialGroupRef);
	recomputeGroupIntegrationSnapshots(affectedGroups);
	BUS_GroupMediaListChanged.next({
		groups:           affectedGroups,
		affectedMediaIds: result.affectedMediaIds,
	});
	if (shouldRefreshGroupList) {
		BUS_GroupListChanged.next({});
	}
}

export function publishOfficialGroupListChanged(affectedGroups?: GroupRef[]): void {
	BUS_GroupListChanged.next(affectedGroups ? { affectedGroups } : {});
}

export function publishOfficialGroupCreated(group: GroupRef, affectedMediaIds: number[]): void {
	recomputeGroupIntegrationSnapshots([ group ]);
	BUS_GroupListChanged.next({});
	BUS_GroupMediaListChanged.next({
		groups: [ group ],
		affectedMediaIds,
	});
}

export function publishOfficialGroupRemoved(group: GroupRef, affectedMediaIds: number[]): void {
	BUS_GroupListChanged.next({});
	BUS_GroupMediaListChanged.next({
		groups: [ group ],
		affectedMediaIds,
	});
}

export function publishOfficialGroupMediaChanged(group: GroupRef, affectedMediaIds: number[]): void {
	recomputeGroupIntegrationSnapshots([ group ]);
	BUS_GroupMediaListChanged.next({
		groups: [ group ],
		affectedMediaIds,
	});
}

export function publishOfficialGroupingReset(affectedMediaIds: number[], context: string): void {
	LibrarySideEffectsCoordinator.handleGroupingMutation({
		affectedMediaIds,
		affectedGroups: [],
		context,
	});
	BUS_GroupListChanged.next({});
}

export function publishOfficialGroupHidden(group: GroupRef, affectedMediaIds: number[]): void {
	LibrarySideEffectsCoordinator.handleGroupingMutation({
		affectedMediaIds,
		affectedGroups: [ group ],
		context:        "official-group-hide",
	});
}

function recomputeGroupIntegrationSnapshots(groups: GroupRef[]): void {
	UserDbFacade.integration.group.recomputeSnapshotsForGroupRefs(groups);
}

export function createOfficialGroupRef(groupId: number): GroupRef {
	return {
		source: "official",
		groupId,
	};
}

function createUserGroupRef(groupId: number): GroupRef {
	return {
		source: "user",
		groupId,
	};
}
