// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const groupListChangedNext      = vi.fn();
const groupMediaListChangedNext = vi.fn();
const handleGroupingMutation    = vi.fn();
const getGroupBlueprintForMediaSelection = vi.fn();

const userGroupingGetState                      = vi.fn();
const userGroupingForkAnimeGroupingToSnapshot   = vi.fn();
const userGroupingResetToAnimeGrouping          = vi.fn();
const userGroupingListAllMediaIds               = vi.fn();
const userGroupingRestoreDeletedUpstreamLineage = vi.fn();
const userGroupingRebuildFromCurrentAnimeDefaults = vi.fn();
const userCreateGroup                           = vi.fn();
const userCreateMergedGroup                     = vi.fn();
const userAssignMediasToGroup                   = vi.fn();
const userRemoveMediaFromGroup                  = vi.fn();
const userDeleteGroup                           = vi.fn();
const userHideOfficialGroup                     = vi.fn();
const userMergeGroupsIntoTarget                 = vi.fn();
const userForkAndMergeGroupsIntoTarget          = vi.fn();
const userRecomputeGroupIntegrationSnapshots    = vi.fn();

const createGroup          = vi.fn();
const assignMediasToGroup  = vi.fn();
const removeMediaFromGroup = vi.fn();
const countGroups          = vi.fn();
const getMediaIds          = vi.fn();
const deleteGroup          = vi.fn();
const updateGroupDetails   = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_GroupListChanged:      {
			next: groupListChangedNext,
		},
		BUS_GroupMediaListChanged: {
			next: groupMediaListChangedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			group: {
				create: createGroup,
				assignMediasToGroup,
				removeMediaFromGroup,
				count:  countGroups,
				getMediaIds,
			},
			deleteGroup,
			updateGroupDetails,
		},
		UserDbFacade:  {
			grouping:    {
				getState:                      userGroupingGetState,
				forkAnimeGroupingToSnapshot:   userGroupingForkAnimeGroupingToSnapshot,
				resetToAnimeGrouping:          userGroupingResetToAnimeGrouping,
				listAllMediaIds:               userGroupingListAllMediaIds,
				restoreDeletedUpstreamLineage: userGroupingRestoreDeletedUpstreamLineage,
				rebuildFromCurrentAnimeDefaults: userGroupingRebuildFromCurrentAnimeDefaults,
				createGroup:                   userCreateGroup,
				createMergedGroup:             userCreateMergedGroup,
				assignMediasToGroup:           userAssignMediasToGroup,
				removeMediaFromGroup:          userRemoveMediaFromGroup,
				deleteGroup:                   userDeleteGroup,
				hideOfficialGroup:             userHideOfficialGroup,
				mergeGroupsIntoTarget:         userMergeGroupsIntoTarget,
				forkAndMergeGroupsIntoTarget:  userForkAndMergeGroupsIntoTarget,
			},
			integration: {
				group: {
					recomputeSnapshotsForGroupRefs: userRecomputeGroupIntegrationSnapshots,
				},
			},
		},
	}),
);

vi.mock(
	"../library/library-side-effects-coordinator",
	() => ({
		LibrarySideEffectsCoordinator: {
			handleGroupingMutation,
		},
	}),
);

vi.mock(
	"../../utils/compute-group-for-new-media/get-group-blueprint",
	() => ({
		getGroupBlueprintForMediaSelection,
	}),
);

describe(
	"GroupMutationService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			userGroupingGetState.mockReturnValue({ groupingMode: "anime" });
			userGroupingListAllMediaIds.mockReturnValue([]);
			getGroupBlueprintForMediaSelection.mockImplementation((mediaIds: number[], overrides?: { name?: string }) => ({
				baseMediaId: Math.min(...mediaIds),
				name:        overrides?.name ?? "Derived Group",
				description: "Derived description",
				imageUrl:    "derived-image.jpg",
			}));
		});

		it(
			"recomputes official group tracking snapshots when auto-grouping creates a group",
			async () => {
				createGroup.mockReturnValue(77);

				const { GroupMutationService } = await import("./group-mutation-service");
				const createdGroupId           = GroupMutationService.createGroup(
					{
						baseMediaId: 21,
						name:        "Auto Group",
						description: "Auto description",
						imageUrl:    "auto.jpg",
					},
					[
						21,
						22,
					],
				);

				expect(createdGroupId).toBe(77);
				expect(createGroup).toHaveBeenCalledWith(
					expect.objectContaining({
						baseMediaId: 21,
						name:        "Auto Group",
					}),
					[
						21,
						22,
					],
				);
				expect(userRecomputeGroupIntegrationSnapshots).toHaveBeenCalledWith([
					{
						source:  "official",
						groupId: 77,
					},
				]);
				expect(groupListChangedNext).toHaveBeenCalledWith({});
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups:           [
						{
							source:  "official",
							groupId: 77,
						},
					],
					affectedMediaIds: [
						21,
						22,
					],
				});
			},
		);

		it(
			"recomputes official group tracking snapshots when auto-grouping assigns media",
			async () => {
				const { GroupMutationService } = await import("./group-mutation-service");
				GroupMutationService.assignMediasToGroup(
					8,
					[
						21,
						22,
					],
					true,
				);

				expect(assignMediasToGroup).toHaveBeenCalledWith(
					8,
					[
						21,
						22,
					],
					true,
				);
				expect(userRecomputeGroupIntegrationSnapshots).toHaveBeenCalledWith([
					{
						source:  "official",
						groupId: 8,
					},
				]);
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups:           [
						{
							source:  "official",
							groupId: 8,
						},
					],
					affectedMediaIds: [
						21,
						22,
					],
				});
			},
		);

		it(
			"routes additive user-mode assignment through the grouping facade and coordinator",
			async () => {
				userGroupingGetState.mockReturnValue({ groupingMode: "user" });
				userAssignMediasToGroup.mockReturnValue({
					affectedMediaIds: [
						21,
						22,
					],
					affectedGroupIds: [ 3 ],
				});

				const { GroupMutationService } = await import("./group-mutation-service");
				GroupMutationService.assignMediasToGroup(
					3,
					[
						21,
						22,
					],
					false,
				);

				expect(userAssignMediasToGroup).toHaveBeenCalledWith(
					3,
					[
						21,
						22,
					],
				);
				expect(userRecomputeGroupIntegrationSnapshots).toHaveBeenCalledWith([
					{
						source:  "user",
						groupId: 3,
					},
				]);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						21,
						22,
					],
					affectedGroups: [
						{
							source:  "user",
							groupId: 3,
						},
					],
					context:          "manual-group-assign",
				});
				expect(assignMediasToGroup).not.toHaveBeenCalled();
			},
		);

		it(
			"creates a manual user group from selection and forks first when still in anime mode",
			async () => {
				userCreateGroup.mockReturnValue(44);
				userAssignMediasToGroup.mockReturnValue({
					affectedMediaIds: [
						21,
						22,
					],
					affectedGroupIds: [ 44 ],
				});

				const { GroupMutationService } = await import("./group-mutation-service");
				const createdGroupId = GroupMutationService.createManualGroup(
					"Fresh Group",
					[
						22,
						21,
						22,
					],
				);

				expect(createdGroupId).toBe(44);
				expect(userGroupingForkAnimeGroupingToSnapshot).toHaveBeenCalledTimes(1);
				expect(getGroupBlueprintForMediaSelection).toHaveBeenCalledWith(
					[
						22,
						21,
					],
					{ name: "Fresh Group" },
				);
				expect(userCreateGroup).toHaveBeenCalledWith(expect.objectContaining({
					baseMediaId:   21,
					name:          "Fresh Group",
					description:   "Derived description",
					imageUrl:      "derived-image.jpg",
					isUserCreated: 1,
				}));
				expect(userAssignMediasToGroup).toHaveBeenCalledWith(
					44,
					[
						22,
						21,
					],
				);
				expect(userRecomputeGroupIntegrationSnapshots).toHaveBeenCalledWith([
					{
						source:  "user",
						groupId: 44,
					},
				]);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						21,
						22,
					],
					affectedGroups: [
						{
							source:  "user",
							groupId: 44,
						},
					],
					context:        "manual-group-create",
				});
			},
		);

		it(
			"creates a merged user group atomically through the grouping facade",
			async () => {
				userCreateMergedGroup.mockReturnValue({
					createdGroupId: 91,
					affectedMediaIds: [
						21,
						22,
						23,
					],
					affectedGroupIds: [
						91,
						10,
						11,
					],
				});

				const { GroupMutationService } = await import("./group-mutation-service");
				const createdGroupId = GroupMutationService.createMergedGroup(
					"Merged Group",
					[
						10,
						11,
					],
					[
						23,
						21,
						22,
						21,
					],
				);

				expect(createdGroupId).toBe(91);
				expect(userGroupingForkAnimeGroupingToSnapshot).toHaveBeenCalledTimes(1);
				expect(getGroupBlueprintForMediaSelection).toHaveBeenCalledWith(
					[
						23,
						21,
						22,
					],
					{ name: "Merged Group" },
				);
				expect(userCreateMergedGroup).toHaveBeenCalledWith(
					expect.objectContaining({
						baseMediaId:   21,
						name:          "Merged Group",
						description:   "Derived description",
						imageUrl:      "derived-image.jpg",
						isUserCreated: 1,
					}),
					[
						10,
						11,
					],
					[
						23,
						21,
						22,
					],
				);
				expect(userRecomputeGroupIntegrationSnapshots).toHaveBeenCalledWith([
					{
						source:  "user",
						groupId: 91,
					},
					{
						source:  "user",
						groupId: 10,
					},
					{
						source:  "user",
						groupId: 11,
					},
				]);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						21,
						22,
						23,
					],
					affectedGroups: [
						{
							source:  "user",
							groupId: 91,
						},
						{
							source:  "user",
							groupId: 10,
						},
						{
							source:  "user",
							groupId: 11,
						},
					],
					context:        "manual-group-merge-create",
				});
			},
		);

		it(
			"publishes anime-mode remove invalidation and list refresh when group count changes",
			async () => {
				countGroups
					.mockReturnValueOnce(2)
					.mockReturnValueOnce(1);

				const { GroupMutationService } = await import("./group-mutation-service");
				GroupMutationService.removeMediaFromGroup(
					5,
					9,
				);

				expect(removeMediaFromGroup).toHaveBeenCalledWith(
					5,
					9,
				);
				expect(userRecomputeGroupIntegrationSnapshots).toHaveBeenCalledWith([
					{
						source:  "official",
						groupId: 5,
					},
				]);
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups: [
						{
							source:  "official",
							groupId: 5,
						},
					],
					affectedMediaIds: [ 9 ],
				});
				expect(groupListChangedNext).toHaveBeenCalledWith({});
				expect(handleGroupingMutation).not.toHaveBeenCalled();
			},
		);

		it(
			"deletes anime-mode groups directly and emits affected medias",
			async () => {
				getMediaIds.mockReturnValue([
					70,
					71,
				]);

				const { GroupMutationService } = await import("./group-mutation-service");
				GroupMutationService.deleteGroup(6);

				expect(deleteGroup).toHaveBeenCalledWith(6);
				expect(groupListChangedNext).toHaveBeenCalledWith({});
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups:           [
						{
							source:  "official",
							groupId: 6,
						},
					],
					affectedMediaIds: [
						70,
						71,
					],
				});
			},
		);

		it(
			"hides official groups without deleting source rows and republishes orphan-sensitive invalidation",
			async () => {
				getMediaIds.mockReturnValue([
					70,
					71,
				]);

				const { GroupMutationService } = await import("./group-mutation-service");
				GroupMutationService.hideOfficialGroup(6);

				expect(userHideOfficialGroup).toHaveBeenCalledWith(6);
				expect(deleteGroup).not.toHaveBeenCalled();
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						70,
						71,
					],
					affectedGroups: [
						{
							source:  "official",
							groupId: 6,
						},
					],
					context:        "official-group-hide",
				});
			},
		);

		it(
			"uses fork-and-merge in anime mode and direct merge in user mode",
			async () => {
				userForkAndMergeGroupsIntoTarget.mockReturnValue({
					affectedMediaIds: [ 80 ],
					affectedGroupIds: [
						11,
						12,
					],
				});
				userMergeGroupsIntoTarget.mockReturnValue({
					affectedMediaIds: [ 90 ],
					affectedGroupIds: [
						15,
						16,
					],
				});

				const { GroupMutationService } = await import("./group-mutation-service");

				GroupMutationService.mergeGroupsIntoTarget(
					11,
					[ 12 ],
				);
				expect(userForkAndMergeGroupsIntoTarget).toHaveBeenCalledWith(
					11,
					[ 12 ],
				);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [ 80 ],
					affectedGroups: [
						{
							source:  "user",
							groupId: 11,
						},
						{
							source:  "user",
							groupId: 12,
						},
					],
					context:          "manual-group-merge",
				});

				vi.clearAllMocks();
				userGroupingGetState.mockReturnValue({ groupingMode: "user" });

				GroupMutationService.mergeGroupsIntoTarget(
					15,
					[ 16 ],
				);
				expect(userMergeGroupsIntoTarget).toHaveBeenCalledWith(
					15,
					[ 16 ],
				);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [ 90 ],
					affectedGroups: [
						{
							source:  "user",
							groupId: 15,
						},
						{
							source:  "user",
							groupId: 16,
						},
					],
					context:          "manual-group-merge",
				});
			},
		);

		it(
			"resets user grouping, republishes visible media invalidation, and refreshes the group list",
			async () => {
				userGroupingListAllMediaIds.mockReturnValue([
					21,
					22,
				]);

				const { GroupMutationService } = await import("./group-mutation-service");
				GroupMutationService.resetToAnimeDefaults();

				expect(userGroupingListAllMediaIds).toHaveBeenCalledTimes(1);
				expect(userGroupingResetToAnimeGrouping).toHaveBeenCalledTimes(1);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						21,
						22,
					],
					affectedGroups: [],
					context:          "manual-group-reset",
				});
				expect(groupListChangedNext).toHaveBeenCalledWith({});
			},
		);

		it(
			"restores a deleted upstream lineage through the grouping facade and coordinator",
			async () => {
				userGroupingRestoreDeletedUpstreamLineage.mockReturnValue({
					groupLineageId:  501,
					restoredGroupId: 42,
					affectedMediaIds: [ 920008 ],
					affectedGroupIds: [ 42 ],
				});

				const { GroupMutationService } = await import("./group-mutation-service");
				const restoredGroupId = GroupMutationService.restoreDeletedUpstreamLineage(501);

				expect(restoredGroupId).toBe(42);
				expect(userGroupingRestoreDeletedUpstreamLineage).toHaveBeenCalledWith(501);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [ 920008 ],
					affectedGroups: [
						{
							source:  "user",
							groupId: 42,
						},
					],
					context:        "manual-group-restore-lineage",
				});
			},
		);

		it(
			"rebuilds the current user snapshot from anime defaults and refreshes the group list",
			async () => {
				userGroupingRebuildFromCurrentAnimeDefaults.mockReturnValue({
					affectedMediaIds: [
						21,
						22,
					],
					affectedGroupIds: [],
				});

				const { GroupMutationService } = await import("./group-mutation-service");
				GroupMutationService.rebuildFromCurrentAnimeDefaults();

				expect(userGroupingRebuildFromCurrentAnimeDefaults).toHaveBeenCalledTimes(1);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						21,
						22,
					],
					affectedGroups: [],
					context:        "manual-group-rebuild",
				});
				expect(groupListChangedNext).toHaveBeenCalledWith({});
			},
		);
	},
);
