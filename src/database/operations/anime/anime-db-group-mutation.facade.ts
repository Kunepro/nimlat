import type {
	CreateMergedUserGroupResultDto,
	GroupBlueprintDto,
	GroupingMutationImpactDto,
} from "@nimlat/types/anime-db";
import type { AnimeGroupDetails } from "@nimlat/types/nimlat-anime";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { assignMediasToGroup } from "./groups/assign-medias-to-group";
import { createGroup } from "./groups/create-group/create-group";
import { createMergedOfficialGroup } from "./groups/create-merged-official-group";
import { deleteGroupById } from "./groups/delete-group-by-id";
import { mergeOfficialGroupsIntoTarget } from "./groups/merge-official-groups-into-target";
import { updateGroupDetails } from "./groups/update-group-details";
import { removeMediaFromExistingGroup } from "./media/remove-media-from-existing-group";

// Official-group mutations are admin/catalog operations. User grouping edits
// must use UserDbFacade so anime_data remains the canonical released baseline.
export const AnimeDbGroupMutationFacade = {
	create(groupDto: Omit<GroupBlueprintDto, "id">, linkedMediaIds?: number[]): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.create",
			() => createGroup(
				groupDto,
				linkedMediaIds,
			),
			{ linkedMediaIds },
		);
	},

	createMerged(
		groupDto: Omit<GroupBlueprintDto, "id">,
		sourceGroupIds: number[],
		mediaIds: number[],
	): CreateMergedUserGroupResultDto {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.createMerged",
			() => createMergedOfficialGroup(
				groupDto,
				sourceGroupIds,
				mediaIds,
			),
			{
				sourceGroupIds,
				mediaIds,
			},
		);
	},

	assignMediasToGroup(groupId: number, mediaIds: number[], isOfficial?: boolean): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.group.assignMediasToGroup",
			() => assignMediasToGroup(
				groupId,
				mediaIds,
				isOfficial,
			),
			{
				groupId,
				mediaIds,
				isOfficial,
			},
		);
	},

	removeMediaFromGroup(groupId: number, mediaId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.group.removeMediaFromGroup",
			() => removeMediaFromExistingGroup(
				groupId,
				mediaId,
			),
			{
				groupId,
				mediaId,
			},
		);
	},

	mergeGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): GroupingMutationImpactDto {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.mergeGroupsIntoTarget",
			() => mergeOfficialGroupsIntoTarget(
				targetGroupId,
				sourceGroupIds,
			),
			{
				targetGroupId,
				sourceGroupIds,
			},
		);
	},

	updateDetails(groupId: number, details: AnimeGroupDetails): boolean {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.updateDetails",
			() => updateGroupDetails(
				groupId,
				details,
			),
			{ groupId },
		);
	},

	deleteGroup(groupId: number): void {
		runAnimeDbFacadeOperation(
			"anime-db.facade.group.deleteGroup",
			() => deleteGroupById(groupId),
			{ groupId },
		);
	},
} as const;
