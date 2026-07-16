import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import type { GroupBlueprintDto } from "@nimlat/types/anime-db";
import type { PreparedNamedMediaSelection } from "./group-mutation-input";
import { createOfficialGroupBlueprintFromSelection } from "./group-mutation-input";
import {
	createOfficialGroupRef,
	publishOfficialGroupCreated,
	publishOfficialGroupHidden,
	publishOfficialGroupingMutation,
	publishOfficialGroupListChanged,
	publishOfficialGroupMediaChanged,
	publishOfficialGroupRemoved,
} from "./group-mutation-side-effects";

// AnimeDB Group writes are catalog-curation operations. They stay isolated from
// user-snapshot writes because future schema migrations must reason about those
// two durability domains separately.
export function createAnimeGroup(groupDto: Omit<GroupBlueprintDto, "id">, linkedMediaIds: number[]): number {
	const createdGroupId = AnimeDbFacade.group.create(
		groupDto,
		linkedMediaIds,
	);
	publishOfficialGroupCreated(
		createOfficialGroupRef(createdGroupId),
		linkedMediaIds,
	);
	return createdGroupId;
}

export function createAnimeGroupFromSelection(selection: PreparedNamedMediaSelection): number {
	return createAnimeGroup(
		createOfficialGroupBlueprintFromSelection(selection),
		selection.mediaIds,
	);
}

export function createMergedAnimeGroupFromSelection(selection: PreparedNamedMediaSelection, sourceGroupIds: number[]): number {
	const result = AnimeDbFacade.group.createMerged(
		createOfficialGroupBlueprintFromSelection(selection),
		sourceGroupIds,
		selection.mediaIds,
	);
	publishOfficialGroupingMutation(
		result,
		true,
	);
	return result.createdGroupId;
}

export function assignMediasToAnimeGroup(groupId: number, mediaIds: number[], isOfficial: boolean): void {
	AnimeDbFacade.group.assignMediasToGroup(
		groupId,
		mediaIds,
		isOfficial,
	);
	publishOfficialGroupMediaChanged(
		createOfficialGroupRef(groupId),
		mediaIds,
	);
}

export function removeMediaFromAnimeGroup(groupId: number, mediaId: number): void {
	const countBefore = AnimeDbFacade.group.count();
	AnimeDbFacade.group.removeMediaFromGroup(
		groupId,
		mediaId,
	);
	const countAfter = AnimeDbFacade.group.count();
	publishOfficialGroupMediaChanged(
		createOfficialGroupRef(groupId),
		[ mediaId ],
	);

	if (countAfter !== countBefore) {
		publishOfficialGroupListChanged();
	}
}

export function updateAnimeGroupDetails(groupId: number, name: string, description?: string, imageUrl?: string): void {
	AnimeDbFacade.updateGroupDetails(
		groupId,
		{
			name,
			description,
			imageUrl,
		},
	);
	publishOfficialGroupListChanged([ createOfficialGroupRef(groupId) ]);
}

export function deleteAnimeGroup(groupId: number): void {
	const affectedMediaIds = AnimeDbFacade.group.getMediaIds(groupId);
	AnimeDbFacade.deleteGroup(groupId);
	publishOfficialGroupRemoved(
		createOfficialGroupRef(groupId),
		affectedMediaIds,
	);
}

export function hideOfficialAnimeGroup(groupId: number): void {
	const affectedMediaIds = AnimeDbFacade.group.getMediaIds(groupId);
	UserDbFacade.grouping.hideOfficialGroup(groupId);
	publishOfficialGroupHidden(
		createOfficialGroupRef(groupId),
		affectedMediaIds,
	);
}

export function mergeAnimeGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): void {
	const result = AnimeDbFacade.group.mergeGroupsIntoTarget(
		targetGroupId,
		sourceGroupIds,
	);
	publishOfficialGroupingMutation(
		result,
		true,
	);
}
