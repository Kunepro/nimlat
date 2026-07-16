// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const createMergedGroup               = vi.fn();
const createManualGroup               = vi.fn();
const createMergedOfficialGroup = vi.fn();
const createOfficialManualGroup = vi.fn();
const isAdminModeEnabled        = vi.fn();
const resolveLibrarySelectionMediaIds = vi.fn();
const logMainServiceError             = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			config: {
				isAdminModeEnabled,
			},
			grouping: {
				getState: vi.fn(() => ({ groupingMode: "user" })),
			},
		},
	}),
);

vi.mock(
	"@nimlat/functions",
	() => ({
		typeSafeError: (error: unknown) => error instanceof Error
			? error
			: new Error(String(error)),
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError,
		},
	}),
);

vi.mock(
	"../group/group-mutation-service",
	() => ({
		GroupMutationService: {
			createManualGroup,
			createOfficialManualGroup,
			createMergedGroup,
			createMergedOfficialGroup,
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
		GroupReconcileApplyService: {},
	}),
);

vi.mock(
	"../group/group-reconcile-preflight-service",
	() => ({
		GroupReconcilePreflightService: {},
	}),
);

describe(
	"GroupManualAssignmentService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			isAdminModeEnabled.mockReturnValue(false);
			resolveLibrarySelectionMediaIds.mockReturnValue([
				100,
				200,
				300,
			]);
		});

		it(
			"allows one selected source group to be replaced by a newly named merged group",
			async () => {
				createMergedGroup.mockReturnValue(55);

				const { GroupManualAssignmentService } = await import("./group-manual-assignment-service");
				const result                           = GroupManualAssignmentService.createMergedGroupFromLibrarySelection({
					name:  ".hack",
					items: [
						{
							kind:  "group",
							group: {
								source:  "user",
								groupId: 29,
							},
						},
						{
							kind:    "media",
							mediaId: 3269,
						},
					],
				});

				expect(result).toEqual({
					success:        true,
					createdGroupId: 55,
				});
				expect(createMergedGroup).toHaveBeenCalledWith(
					".hack",
					[ 29 ],
					[
						100,
						200,
						300,
					],
				);
				expect(createManualGroup).not.toHaveBeenCalled();
			},
		);

		it(
			"creates replacement groups as official AnimeDB groups in admin mode",
			async () => {
				isAdminModeEnabled.mockReturnValue(true);
				createMergedOfficialGroup.mockReturnValue(66);

				const { GroupManualAssignmentService } = await import("./group-manual-assignment-service");
				const result                           = GroupManualAssignmentService.createMergedGroupFromLibrarySelection({
					name:  "Curated",
					items: [
						{
							kind:  "group",
							group: {
								source:  "official",
								groupId: 29,
							},
						},
					],
				});

				expect(result).toEqual({
					success:        true,
					createdGroupId: 66,
				});
				expect(createMergedOfficialGroup).toHaveBeenCalledWith(
					"Curated",
					[ 29 ],
					[
						100,
						200,
						300,
					],
				);
				expect(createMergedGroup).not.toHaveBeenCalled();
			},
		);

		it(
			"still rejects replacement group creation when no source group is selected",
			async () => {
				const { GroupManualAssignmentService } = await import("./group-manual-assignment-service");
				const result                           = GroupManualAssignmentService.createMergedGroupFromLibrarySelection({
					name:  "No Source",
					items: [
						{
							kind:    "media",
							mediaId: 3269,
						},
					],
				});

				expect(result).toEqual({
					success: false,
					error:   "Select at least one group to replace.",
				});
				expect(createMergedGroup).not.toHaveBeenCalled();
			},
		);
	},
);
