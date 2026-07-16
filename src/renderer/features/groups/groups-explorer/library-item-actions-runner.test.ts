import type {
	GroupExplorerCard,
	LibraryDisplayItem,
	LibrarySelectionInput,
} from "@nimlat/types/ipc-payloads";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	GroupAssignmentsFacade,
	GroupExplorerFacade,
} from "../../../facades";
import {
	deleteLibraryManualGroup,
	loadAddToGroupTargetGroups,
	persistAddToExistingGroup,
	persistAddToNewGroup,
	persistLibraryItemRefresh,
	persistLibraryItemWatchState,
} from "./library-item-actions-runner";

function createMediaItem(mediaId: number): LibraryDisplayItem {
	return {
		key:         `media:${ mediaId }`,
		kind:        "media",
		name:        `Media ${ mediaId }`,
		mediaId,
		lastRefresh: "",
	};
}

function createGroupItem(groupId: number): LibraryDisplayItem {
	return {
		key:         `group:user:${ groupId }`,
		kind:        "group",
		name:        `Group ${ groupId }`,
		group:       {
			source: "user",
			groupId,
		},
		lastRefresh: "",
	};
}

function createGroupCard(id: number): GroupExplorerCard {
	return {
		id,
		name:        `Group ${ id }`,
		lastRefresh: "",
	};
}

describe(
	"library-item-actions-runner",
	() => {
		const selectionInputs: LibrarySelectionInput[] = [
			{
				kind:    "media",
				mediaId: 7,
			},
		];

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists library watched state through group or media facade commands",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [ 7 ],
				});
				vi.spyOn(
					GroupExplorerFacade,
					"setGroupWatchState",
				).mockResolvedValue({
					success:         true,
					changedMediaIds: [
						1,
						2,
					],
				});

				await expect(persistLibraryItemWatchState(
					createMediaItem(7),
					true,
				)).resolves.toEqual({
					success:         true,
					changedMediaIds: [ 7 ],
				});
				await expect(persistLibraryItemWatchState(
					createGroupItem(3),
					false,
				)).resolves.toEqual({
					success:         true,
					changedMediaIds: [
						1,
						2,
					],
				});
				await expect(persistLibraryItemWatchState(
					{
						key:         "media:missing",
						kind:        "media",
						name:        "Missing target",
						lastRefresh: "",
					},
					true,
				)).toBeNull();

				expect(GroupExplorerFacade.setMediaWatchState).toHaveBeenCalledWith({
					mediaIds:  [ 7 ],
					isWatched: true,
				});
				expect(GroupExplorerFacade.setGroupWatchState).toHaveBeenCalledWith({
					group:     {
						source:  "user",
						groupId: 3,
					},
					isWatched: false,
				});
			},
		);

		it(
			"persists library refreshes and manual group deletion through the appropriate facades",
			async () => {
				const groupItem = createGroupItem(3);
				if (!groupItem.group) {
					throw new Error("Group test item was created without a group ref.");
				}
				vi.spyOn(
					GroupExplorerFacade,
					"refreshMedia",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupExplorerFacade,
					"refreshGroup",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupAssignmentsFacade,
					"deleteGroupManual",
				).mockResolvedValue({ success: true });

				await expect(persistLibraryItemRefresh(createMediaItem(7))).resolves.toEqual({ success: true });
				await expect(persistLibraryItemRefresh(groupItem)).resolves.toEqual({ success: true });
				await expect(deleteLibraryManualGroup(groupItem.group)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.refreshMedia).toHaveBeenCalledWith(7);
				expect(GroupExplorerFacade.refreshGroup).toHaveBeenCalledWith(groupItem.group);
				expect(GroupAssignmentsFacade.deleteGroupManual).toHaveBeenCalledWith({ group: groupItem.group });
			},
		);

		it(
			"routes Add To existing-group actions between assign and merge commands",
			async () => {
				vi.spyOn(
					GroupAssignmentsFacade,
					"assignLibrarySelectionToGroup",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupAssignmentsFacade,
					"mergeLibrarySelectionIntoGroup",
				).mockResolvedValue({ success: true });

				await persistAddToExistingGroup({
					groupId:                    3,
					hasMergeableSelectedGroups: false,
					isPreferredTarget:          true,
					selectionInputs,
				});
				await persistAddToExistingGroup({
					groupId:                    4,
					hasMergeableSelectedGroups: true,
					isPreferredTarget:          true,
					selectionInputs,
				});

				expect(GroupAssignmentsFacade.assignLibrarySelectionToGroup).toHaveBeenCalledWith({
					groupId: 3,
					items:   selectionInputs,
				});
				expect(GroupAssignmentsFacade.mergeLibrarySelectionIntoGroup).toHaveBeenCalledWith({
					targetGroupId: 4,
					items:         selectionInputs,
				});
			},
		);

		it(
			"routes Add To new-group actions between create and create-merged commands",
			async () => {
				vi.spyOn(
					GroupAssignmentsFacade,
					"createGroupFromLibrarySelection",
				).mockResolvedValue({
					success:        true,
					createdGroupId: 3,
				});
				vi.spyOn(
					GroupAssignmentsFacade,
					"createMergedGroupFromLibrarySelection",
				).mockResolvedValue({
					success:        true,
					createdGroupId: 4,
				});

				await persistAddToNewGroup({
					createName:       "New group",
					hasSelectedGroup: false,
					selectionInputs,
				});
				await persistAddToNewGroup({
					createName:       "Merged group",
					hasSelectedGroup: true,
					selectionInputs,
				});

				expect(GroupAssignmentsFacade.createGroupFromLibrarySelection).toHaveBeenCalledWith({
					name:  "New group",
					items: selectionInputs,
				});
				expect(GroupAssignmentsFacade.createMergedGroupFromLibrarySelection).toHaveBeenCalledWith({
					name:  "Merged group",
					items: selectionInputs,
				});
			},
		);

		it(
			"loads all Add To group targets through paginated facade reads",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"listCards",
				)
					.mockResolvedValueOnce({
						cards:      [ createGroupCard(1) ],
						nextOffset: 200,
						total:      2,
					})
					.mockResolvedValueOnce({
						cards:      [ createGroupCard(2) ],
						nextOffset: null,
						total:      2,
					});

				await expect(loadAddToGroupTargetGroups()).resolves.toEqual([
					createGroupCard(1),
					createGroupCard(2),
				]);

				expect(GroupExplorerFacade.listCards).toHaveBeenNthCalledWith(
					1,
					0,
					200,
					"",
				);
				expect(GroupExplorerFacade.listCards).toHaveBeenNthCalledWith(
					2,
					200,
					200,
					"",
				);
			},
		);
	},
);
