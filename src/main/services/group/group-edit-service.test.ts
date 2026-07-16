// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const groupListChangedNext = vi.fn();
const groupOverrideGet     = vi.fn();
const groupOverrideSave    = vi.fn();
const groupOverrideDelete  = vi.fn();
const officialGroupGetSummary = vi.fn();
const officialGroupUpdate = vi.fn();
const userGroupGetSummary     = vi.fn();
const userGroupUpdate      = vi.fn();
const isAdminModeEnabled  = vi.fn();
const getSelectionSnapshot = vi.fn();
const applyGroupSelections = vi.fn();
const logMainServiceError  = vi.fn();
const toasterError         = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_GroupListChanged: {
			next: groupListChangedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			group:              {
				getInspectionSummary: officialGroupGetSummary,
			},
			updateGroupDetails: officialGroupUpdate,
		},
		UserDbFacade: {
			config: {
				isAdminModeEnabled,
			},
			overrides: {
				group: {
					get:    groupOverrideGet,
					save:   groupOverrideSave,
					delete: groupOverrideDelete,
				},
			},
			grouping:  {
				getInspectionSummary: userGroupGetSummary,
				updateGroupDetails:   userGroupUpdate,
			},
		},
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
	"../../utils/toaster",
	() => ({
		Toaster: {
			error: toasterError,
		},
	}),
);

vi.mock(
	"electron",
	() => ({
		BrowserWindow: {
			getAllWindows:    vi.fn(() => []),
			getFocusedWindow: vi.fn(() => null),
		},
		dialog:        {
			showOpenDialog: vi.fn(),
		},
	}),
);

vi.mock(
	"../image-cache/image-gallery-service",
	() => ({
		ImageGalleryService: {
			getGroupSelectionSnapshot: getSelectionSnapshot,
			applyGroupSelections,
		},
	}),
);

describe(
	"GroupEditService.saveEdit",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			isAdminModeEnabled.mockReturnValue(false);
			getSelectionSnapshot.mockReturnValue([
				{
					role:         "portrait",
					candidateKey: "provider:old",
				},
			]);
		});

		it(
			"rolls back official-group text overrides when image selection persistence fails",
			async () => {
				groupOverrideGet.mockReturnValue(null);
				officialGroupGetSummary.mockReturnValue(null);
				applyGroupSelections
					.mockImplementationOnce(() => {
						throw new Error("selection failed");
					})
					.mockImplementationOnce(() => undefined);

				const { GroupEditService } = await import("./group-edit-service");
				const group                = {
					source:  "official" as const,
					groupId: 7,
				};
				const result               = GroupEditService.saveEdit({
					group,
					name:        "New name",
					description: "New description",
					selections:  [
						{
							role:         "portrait",
							candidateKey: "upload:44",
						},
					],
				});

				expect(result.success).toBe(false);
				expect(groupOverrideSave).toHaveBeenCalledWith(expect.objectContaining({
					animeGroupId: 7,
					name:         "New name",
				}));
				expect(groupOverrideDelete).toHaveBeenCalledWith(7);
				expect(applyGroupSelections).toHaveBeenLastCalledWith(
					group,
					[
						{
							role:         "portrait",
							candidateKey: "provider:old",
						},
					],
				);
				expect(groupListChangedNext).not.toHaveBeenCalled();
			},
		);

		it(
			"saves official group edits to AnimeDB in admin mode",
			async () => {
				isAdminModeEnabled.mockReturnValue(true);
				officialGroupGetSummary.mockReturnValue({
					groupId:     7,
					name:        "Old official",
					description: "Old description",
				});

				const { GroupEditService } = await import("./group-edit-service");
				const result               = GroupEditService.saveEdit({
					group:       {
						source:  "official",
						groupId: 7,
					},
					name:        "Curated",
					description: "Official description",
					selections:  [],
				});

				expect(result.success).toBe(true);
				expect(officialGroupUpdate).toHaveBeenCalledWith(
					7,
					{
						name:        "Curated",
						description: "Official description",
					},
				);
				expect(groupOverrideSave).not.toHaveBeenCalled();
			},
		);
	},
);
