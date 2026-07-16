import type {
	CreateMergedUserGroupResultDto,
	GroupingMutationImpactDto,
	UserGroupBlueprintDto,
} from "@nimlat/types/anime-db";
import { assignMediasToUserGroup } from "./grouping/assign-medias-to-user-group";
import { createMergedUserGroup } from "./grouping/create-merged-user-group";
import { deleteUserGroup } from "./grouping/delete-user-group";
import { forkAndAssignMediasToUserGroup } from "./grouping/fork-and-assign-medias-to-user-group";
import { forkAndDeleteUserGroup } from "./grouping/fork-and-delete-user-group";
import { forkAndMergeUserGroupsIntoTarget } from "./grouping/fork-and-merge-user-groups-into-target";
import { forkAndRemoveMediaFromUserGroup } from "./grouping/fork-and-remove-media-from-user-group";
import { hideOfficialGroup } from "./grouping/hide-official-group";
import { mergeUserGroupsIntoTarget } from "./grouping/merge-user-groups-into-target";
import { removeMediaFromUserGroup } from "./grouping/remove-media-from-user-group";
import { updateUserGroupDetails } from "./grouping/update-user-group-details";
import { createUserGroup } from "./grouping/user-grouping-snapshot";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// User grouping mutations stay DB-owned because every membership change must
// preserve snapshot lineage and return precise invalidation impact to services.
export const UserDbGroupingMutationFacade = {
	// Fork anime-mode grouping and apply the first manual assignment in one transaction.
	forkAndAssignMediasToGroup: (groupId: number, mediaIds: number[]): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.forkAndAssignMediasToGroup",
			() => forkAndAssignMediasToUserGroup(
				groupId,
				mediaIds,
			),
			{
				groupId,
				mediaIds,
			},
		);
	},

	// Fork anime-mode grouping and apply the first manual removal in one transaction.
	forkAndRemoveMediaFromGroup: (groupId: number, mediaId: number): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.forkAndRemoveMediaFromGroup",
			() => forkAndRemoveMediaFromUserGroup(
				groupId,
				mediaId,
			),
			{
				groupId,
				mediaId,
			},
		);
	},

	// Fork anime-mode grouping and delete the chosen group in one transaction.
	forkAndDeleteGroup: (groupId: number): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.forkAndDeleteGroup",
			() => forkAndDeleteUserGroup(groupId),
			{ groupId },
		);
	},

	// Fork anime-mode grouping and merge source groups into a target in one transaction.
	forkAndMergeGroupsIntoTarget: (targetGroupId: number, sourceGroupIds: number[]): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.forkAndMergeGroupsIntoTarget",
			() => forkAndMergeUserGroupsIntoTarget(
				targetGroupId,
				sourceGroupIds,
			),
			{
				targetGroupId,
				sourceGroupIds,
			},
		);
	},

	// Insert one user-owned group row for the forked grouping snapshot.
	createGroup: (group: Omit<UserGroupBlueprintDto, "id">): number => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.createGroup",
			() => createUserGroup(group),
			{ baseMediaId: group.baseMediaId },
		);
	},

	// Create one replacement group for a destructive merge in a single transaction.
	createMergedGroup: (
											 group: Omit<UserGroupBlueprintDto, "id">,
		                   sourceGroupIds: number[],
		                   mediaIds: number[],
										 ): CreateMergedUserGroupResultDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.createMergedGroup",
			() => createMergedUserGroup(
				group,
				sourceGroupIds,
				mediaIds,
			),
			{
				baseMediaId: group.baseMediaId,
				sourceGroupIds,
				mediaIds,
			},
		);
	},

	// Assign one or more canonical medias to a user-owned group row.
	assignMediasToGroup: (groupId: number, mediaIds: number[]): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.assignMediasToGroup",
			() => assignMediasToUserGroup(
				groupId,
				mediaIds,
			),
			{
				groupId,
				mediaIds,
			},
		);
	},

	// Remove one media from one user-owned group row and allow it to become orphaned.
	removeMediaFromGroup: (groupId: number, mediaId: number): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.removeMediaFromGroup",
			() => removeMediaFromUserGroup(
				groupId,
				mediaId,
			),
			{
				groupId,
				mediaId,
			},
		);
	},

	// Delete one user-owned group and allow any newly orphaned medias to stay standalone.
	deleteGroup: (groupId: number): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.deleteGroup",
			() => deleteUserGroup(groupId),
			{ groupId },
		);
	},

	// Suppress one official group without deleting anime_data source rows.
	hideOfficialGroup: (animeGroupId: number): void => {
		runUserDbFacadeOperation(
			"user-db.facade.grouping.hideOfficialGroup",
			() => hideOfficialGroup(animeGroupId),
			{ animeGroupId },
		);
	},

	// Merge one or more source groups into the target user-owned group row.
	mergeGroupsIntoTarget: (targetGroupId: number, sourceGroupIds: number[]): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.mergeGroupsIntoTarget",
			() => mergeUserGroupsIntoTarget(
				targetGroupId,
				sourceGroupIds,
			),
			{
				targetGroupId,
				sourceGroupIds,
			},
		);
	},

	// Update the forked user-owned group row directly.
	updateGroupDetails: (
												groupId: number,
		                    details: {
													name: string;
													description?: string;
													imageUrl?: string;
												},
											): boolean => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.updateGroupDetails",
			() => updateUserGroupDetails(
				groupId,
				details,
			),
			{ groupId },
		);
	},
} as const;
