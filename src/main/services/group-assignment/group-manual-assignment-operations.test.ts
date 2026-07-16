// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const isAdminModeEnabled = vi.fn();
const getGroupingState   = vi.fn();

const assignMediasToGroup             = vi.fn();
const forkAndAssignMediasToGroup      = vi.fn();
const mergeLibrarySelectionIntoTarget = vi.fn();
const mergeOfficialGroupsIntoTarget   = vi.fn();
const deleteOfficialGroup             = vi.fn();
const hideOfficialGroup               = vi.fn();
const deleteGroup                     = vi.fn();
const forkAndDeleteGroup              = vi.fn();

const resolveLibrarySelectionMediaIds = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			config:   {
				isAdminModeEnabled,
			},
			grouping: {
				getState: getGroupingState,
			},
		},
	}),
);

vi.mock(
	"../group/group-mutation-service",
	() => ({
		GroupMutationService: {
			assignMediasToGroup,
			forkAndAssignMediasToGroup,
			mergeLibrarySelectionIntoTarget,
			mergeOfficialGroupsIntoTarget,
			deleteOfficialGroup,
			hideOfficialGroup,
			deleteGroup,
			forkAndDeleteGroup,
		},
	}),
);

vi.mock(
	"./resolve-library-selection-media-ids",
	() => ({
		resolveLibrarySelectionMediaIds,
	}),
);

vi.mock(
	"../group/group-reconcile-apply-service",
	() => ({
		GroupReconcileApplyService: {
			runSafeApply: vi.fn(),
		},
	}),
);

vi.mock(
	"../group/group-reconcile-preflight-service",
	() => ({
		GroupReconcilePreflightService: {
			runPreflight: vi.fn(),
		},
	}),
);

describe(
	"group-manual-assignment-operations",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			isAdminModeEnabled.mockReturnValue(false);
			getGroupingState.mockReturnValue({ groupingMode: "user" });
			resolveLibrarySelectionMediaIds.mockReturnValue([
				100,
				200,
			]);
		});

		it(
			"routes manual media assignment through admin, user, and fork paths",
			async () => {
				const { assignMediasToGroupManually } = await import("./group-manual-assignment-operations");

				isAdminModeEnabled.mockReturnValue(true);
				expect(assignMediasToGroupManually({
					groupId:  7,
					mediaIds: [
						10,
						11,
					],
				})).toEqual({ success: true });
				expect(assignMediasToGroup).toHaveBeenLastCalledWith(
					7,
					[
						10,
						11,
					],
					true,
				);

				isAdminModeEnabled.mockReturnValue(false);
				getGroupingState.mockReturnValue({ groupingMode: "user" });
				assignMediasToGroupManually({
					groupId:  8,
					mediaIds: [ 12 ],
				});
				expect(assignMediasToGroup).toHaveBeenLastCalledWith(
					8,
					[ 12 ],
					false,
				);

				getGroupingState.mockReturnValue({ groupingMode: "anime" });
				assignMediasToGroupManually({
					groupId:  9,
					mediaIds: [ 13 ],
				});
				expect(forkAndAssignMediasToGroup).toHaveBeenCalledWith(
					9,
					[ 13 ],
				);
			},
		);

		it(
			"validates merge target membership before mutating library selections",
			async () => {
				const { mergeLibrarySelectionIntoGroup } = await import("./group-manual-assignment-operations");

				expect(mergeLibrarySelectionIntoGroup({
					targetGroupId: 99,
					items:         [
						{
							kind:  "group",
							group: {
								source:  "user",
								groupId: 1,
							},
						},
						{
							kind:  "group",
							group: {
								source:  "user",
								groupId: 2,
							},
						},
					],
				})).toEqual({
					success: false,
					error:   "Merge target must be one of the selected groups.",
				});
				expect(mergeLibrarySelectionIntoTarget).not.toHaveBeenCalled();
				expect(mergeOfficialGroupsIntoTarget).not.toHaveBeenCalled();
			},
		);

		it(
			"merges selected groups and assigns standalone media through the admin path",
			async () => {
				isAdminModeEnabled.mockReturnValue(true);
				const { mergeLibrarySelectionIntoGroup } = await import("./group-manual-assignment-operations");

				expect(mergeLibrarySelectionIntoGroup({
					targetGroupId: 1,
					items:         [
						{
							kind:  "group",
							group: {
								source:  "official",
								groupId: 1,
							},
						},
						{
							kind:  "group",
							group: {
								source:  "official",
								groupId: 2,
							},
						},
						{
							kind:    "media",
							mediaId: 100,
						},
					],
				})).toEqual({ success: true });

				expect(mergeOfficialGroupsIntoTarget).toHaveBeenCalledWith(
					1,
					[ 2 ],
				);
				expect(assignMediasToGroup).toHaveBeenCalledWith(
					1,
					[
						100,
						200,
					],
					true,
				);
			},
		);

		it(
			"routes manual group deletion by source and current grouping mode",
			async () => {
				const { deleteGroupManually } = await import("./group-manual-assignment-operations");

				isAdminModeEnabled.mockReturnValue(true);
				deleteGroupManually({
					group: {
						source:  "official",
						groupId: 1,
					},
				});
				expect(deleteOfficialGroup).toHaveBeenCalledWith(1);

				isAdminModeEnabled.mockReturnValue(false);
				deleteGroupManually({
					group: {
						source:  "official",
						groupId: 2,
					},
				});
				expect(hideOfficialGroup).toHaveBeenCalledWith(2);

				getGroupingState.mockReturnValue({ groupingMode: "user" });
				deleteGroupManually({
					group: {
						source:  "user",
						groupId: 3,
					},
				});
				expect(deleteGroup).toHaveBeenCalledWith(3);

				getGroupingState.mockReturnValue({ groupingMode: "anime" });
				deleteGroupManually({
					group: {
						source:  "user",
						groupId: 4,
					},
				});
				expect(forkAndDeleteGroup).toHaveBeenCalledWith(4);
			},
		);
	},
);
