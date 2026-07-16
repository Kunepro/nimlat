import { GroupBlueprintDto } from "@nimlat/types/anime-db";
import {
	assignMediasToAnimeGroup,
	createAnimeGroup,
	createAnimeGroupFromSelection,
	createMergedAnimeGroupFromSelection,
	deleteAnimeGroup,
	hideOfficialAnimeGroup,
	mergeAnimeGroupsIntoTarget,
	removeMediaFromAnimeGroup,
	updateAnimeGroupDetails,
} from "./group-anime-mutations";
import { prepareNamedMediaSelection } from "./group-mutation-input";
import {
	assignMediasToUserGroup,
	createMergedUserGroup,
	createUserManualGroup,
	deleteUserGroup,
	forkAndAssignMediasToUserGroup,
	forkAndDeleteUserGroup,
	forkAndRemoveMediaFromUserGroup,
	isUserGroupingMode,
	mergeUserGroupsIntoTarget,
	rebuildUserGroupingFromCurrentAnimeDefaults,
	removeMediaFromUserGroup,
	resetUserGroupingToAnimeDefaults,
	restoreDeletedUserGroupLineage,
} from "./group-user-mutations";

/*
 * Centralized mutating API for group-related writes.
 * Keeping mutation logic and side effects together prevents ad-hoc BUS publication from drifting.
 */
export class GroupMutationService {
	// Creates one official group container and publishes the minimal explorer invalidation set.
	public static createGroup(groupDto: Omit<GroupBlueprintDto, "id">, linkedMediaIds: number[]): number {
		return createAnimeGroup(
			groupDto,
			linkedMediaIds,
		);
	}

	// Manual group creation is additive: it never deletes source groups and uses one bounded media selection.
	public static createManualGroup(name: string, mediaIds: number[]): number {
		const selection = prepareNamedMediaSelection(
			name,
			mediaIds,
		);
		return createUserManualGroup(selection);
	}

	// Admin manual creation writes a curated official Group into AnimeDB without forking user grouping.
	public static createOfficialManualGroup(name: string, mediaIds: number[]): number {
		const selection = prepareNamedMediaSelection(
			name,
			mediaIds,
		);
		return createAnimeGroupFromSelection(selection);
	}

	// Library merge into an existing target combines destructive group merge with additive standalone-media assignment.
	public static mergeLibrarySelectionIntoTarget(targetGroupId: number, selectedGroupIds: number[], mediaIds: number[]): void {
		this.mergeGroupsIntoTarget(
			targetGroupId,
			selectedGroupIds.filter((groupId) => groupId !== targetGroupId),
		);
		this.assignMediasToGroup(
			targetGroupId,
			mediaIds,
			false,
		);
	}

	// Creating a merged group must be atomic because source-group anchors are freed and reused inside one transaction.
	public static createMergedGroup(name: string, sourceGroupIds: number[], mediaIds: number[]): number {
		const selection = prepareNamedMediaSelection(
			name,
			mediaIds,
		);
		return createMergedUserGroup(
			selection,
			sourceGroupIds,
		);
	}

	// Admin replacement-group creation is official and must free source anchors before inserting.
	public static createMergedOfficialGroup(name: string, sourceGroupIds: number[], mediaIds: number[]): number {
		const selection = prepareNamedMediaSelection(
			name,
			mediaIds,
		);
		return createMergedAnimeGroupFromSelection(
			selection,
			sourceGroupIds,
		);
	}

	// User-mode manual assignment is additive only: medias keep existing memberships and gain the chosen target.
	public static assignMediasToGroup(groupId: number, mediaIds: number[], isOfficial: boolean): void {
		if (!isOfficial && isUserGroupingMode()) {
			assignMediasToUserGroup(
				groupId,
				mediaIds,
			);
			return;
		}

		assignMediasToAnimeGroup(
			groupId,
			mediaIds,
			isOfficial,
		);
	}

	// First manual assignment after anime mode forks and applies the mutation in one transaction.
	public static forkAndAssignMediasToGroup(groupId: number, mediaIds: number[]): void {
		forkAndAssignMediasToUserGroup(
			groupId,
			mediaIds,
		);
	}

	// In user mode removing one media can also delete empty groups or re-home base-media identity.
	public static removeMediaFromGroup(groupId: number, mediaId: number): void {
		if (isUserGroupingMode()) {
			removeMediaFromUserGroup(
				groupId,
				mediaId,
			);
			return;
		}

		removeMediaFromAnimeGroup(
			groupId,
			mediaId,
		);
	}

	// First manual removal after anime mode forks and removes in the same transaction.
	public static forkAndRemoveMediaFromGroup(groupId: number, mediaId: number): void {
		forkAndRemoveMediaFromUserGroup(
			groupId,
			mediaId,
		);
	}

	// Admin removals are official AnimeDB curation writes even if a user snapshot exists locally.
	public static removeMediaFromOfficialGroup(groupId: number, mediaId: number): void {
		removeMediaFromAnimeGroup(
			groupId,
			mediaId,
		);
	}

	// Group metadata writes only need list invalidation because explorer ordering can depend on those fields.
	public static updateGroupDetails(groupId: number, name: string, description?: string, imageUrl?: string): void {
		updateAnimeGroupDetails(
			groupId,
			name,
			description,
			imageUrl,
		);
	}

	// User-mode delete leaves newly orphaned medias visible as standalone Library items.
	public static deleteGroup(groupId: number): void {
		if (isUserGroupingMode()) {
			deleteUserGroup(groupId);
			return;
		}

		deleteAnimeGroup(groupId);
	}

	// Admin delete removes the official AnimeDB row; normal UI delete hides it in user_data.
	public static deleteOfficialGroup(groupId: number): void {
		deleteAnimeGroup(groupId);
	}

	// Hiding an official group is UX-delete only; upstream anime DB rows stay intact.
	public static hideOfficialGroup(groupId: number): void {
		hideOfficialAnimeGroup(groupId);
	}

	// First manual delete after anime mode forks and deletes inside the same transaction.
	public static forkAndDeleteGroup(groupId: number): void {
		forkAndDeleteUserGroup(groupId);
	}

	// Group merge is destructive for source containers and is the primitive reused by Library bulk merge.
	public static mergeGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): void {
		mergeUserGroupsIntoTarget(
			targetGroupId,
			sourceGroupIds,
		);
	}

	// Admin merge writes the curated official grouping directly to AnimeDB.
	public static mergeOfficialGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): void {
		mergeAnimeGroupsIntoTarget(
			targetGroupId,
			sourceGroupIds,
		);
	}

	// Reset only clears grouping snapshot state; non-grouping user data remains intact.
	public static resetToAnimeDefaults(): void {
		resetUserGroupingToAnimeDefaults();
	}

	// Restored upstream lineages behave like any other grouping mutation once copied into the user snapshot.
	public static restoreDeletedUpstreamLineage(groupLineageId: number): number {
		return restoreDeletedUserGroupLineage(groupLineageId);
	}

	// Rebuild replaces the full forked snapshot with current anime defaults but keeps user mode enabled.
	public static rebuildFromCurrentAnimeDefaults(): void {
		rebuildUserGroupingFromCurrentAnimeDefaults();
	}

}
