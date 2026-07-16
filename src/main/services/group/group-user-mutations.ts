import { UserDbFacade } from "@nimlat/database";
import type {
	CreateMergedUserGroupResultDto,
	RestoreUserGroupLineageResultDto,
} from "@nimlat/types/anime-db";
import type { PreparedNamedMediaSelection } from "./group-mutation-input";
import { createUserGroupBlueprintFromSelection } from "./group-mutation-input";
import {
	publishOfficialGroupingReset,
	publishOfficialGroupListChanged,
	publishUserGroupingMutation,
} from "./group-mutation-side-effects";

// User grouping writes mutate the local snapshot, not the released AnimeDB catalog.
// Keeping this domain separate makes future migrations and reconcile behavior easier
// to audit without mixing user-owned durability with catalog curation.
export function isUserGroupingMode(): boolean {
	return UserDbFacade.grouping.getState().groupingMode === "user";
}

export function createUserManualGroup(selection: PreparedNamedMediaSelection): number {
	ensureUserGroupingSnapshot();

	const now              = Date.now();
	const createdGroupId   = UserDbFacade.grouping.createGroup(createUserGroupBlueprintFromSelection(
		selection,
		now,
	));
	const assignment       = UserDbFacade.grouping.assignMediasToGroup(
		createdGroupId,
		selection.mediaIds,
	);
	const affectedGroupIds = Array.from(new Set([
		createdGroupId,
		...assignment.affectedGroupIds,
	]));

	publishUserGroupingMutation(
		{
			affectedMediaIds: assignment.affectedMediaIds,
			affectedGroupIds,
		},
		"manual-group-create",
	);
	return createdGroupId;
}

export function createMergedUserGroup(selection: PreparedNamedMediaSelection, sourceGroupIds: number[]): number {
	ensureUserGroupingSnapshot();

	const now                                    = Date.now();
	const result: CreateMergedUserGroupResultDto = UserDbFacade.grouping.createMergedGroup(
		createUserGroupBlueprintFromSelection(
			selection,
			now,
		),
		sourceGroupIds,
		selection.mediaIds,
	);
	publishUserGroupingMutation(
		result,
		"manual-group-merge-create",
	);
	return result.createdGroupId;
}

export function assignMediasToUserGroup(groupId: number, mediaIds: number[]): void {
	const result = UserDbFacade.grouping.assignMediasToGroup(
		groupId,
		mediaIds,
	);
	publishUserGroupingMutation(
		result,
		"manual-group-assign",
	);
}

export function forkAndAssignMediasToUserGroup(groupId: number, mediaIds: number[]): void {
	const result = UserDbFacade.grouping.forkAndAssignMediasToGroup(
		groupId,
		mediaIds,
	);
	publishUserGroupingMutation(
		result,
		"manual-group-assign",
	);
}

export function removeMediaFromUserGroup(groupId: number, mediaId: number): void {
	const result = UserDbFacade.grouping.removeMediaFromGroup(
		groupId,
		mediaId,
	);
	publishUserGroupingMutation(
		result,
		"manual-group-remove-media",
	);
}

export function forkAndRemoveMediaFromUserGroup(groupId: number, mediaId: number): void {
	const result = UserDbFacade.grouping.forkAndRemoveMediaFromGroup(
		groupId,
		mediaId,
	);
	publishUserGroupingMutation(
		result,
		"manual-group-remove-media",
	);
}

export function deleteUserGroup(groupId: number): void {
	const result = UserDbFacade.grouping.deleteGroup(groupId);
	publishUserGroupingMutation(
		result,
		"manual-group-delete",
	);
}

export function forkAndDeleteUserGroup(groupId: number): void {
	const result = UserDbFacade.grouping.forkAndDeleteGroup(groupId);
	publishUserGroupingMutation(
		result,
		"manual-group-delete",
	);
}

export function mergeUserGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): void {
	const result = isUserGroupingMode()
		? UserDbFacade.grouping.mergeGroupsIntoTarget(
			targetGroupId,
			sourceGroupIds,
		)
		: UserDbFacade.grouping.forkAndMergeGroupsIntoTarget(
			targetGroupId,
			sourceGroupIds,
		);
	publishUserGroupingMutation(
		result,
		"manual-group-merge",
	);
}

export function resetUserGroupingToAnimeDefaults(): void {
	const affectedMediaIds = UserDbFacade.grouping.listAllMediaIds();
	UserDbFacade.grouping.resetToAnimeGrouping();
	publishOfficialGroupingReset(
		affectedMediaIds,
		"manual-group-reset",
	);
}

export function restoreDeletedUserGroupLineage(groupLineageId: number): number {
	const result: RestoreUserGroupLineageResultDto = UserDbFacade.grouping.restoreDeletedUpstreamLineage(groupLineageId);
	publishUserGroupingMutation(
		result,
		"manual-group-restore-lineage",
	);
	return result.restoredGroupId;
}

export function rebuildUserGroupingFromCurrentAnimeDefaults(): void {
	const result = UserDbFacade.grouping.rebuildFromCurrentAnimeDefaults();
	publishUserGroupingMutation(
		result,
		"manual-group-rebuild",
	);
	publishOfficialGroupListChanged();
}

function ensureUserGroupingSnapshot(): void {
	if (!isUserGroupingMode()) {
		UserDbFacade.grouping.forkAnimeGroupingToSnapshot();
	}
}
