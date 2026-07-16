// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const userGroupingGetState    = vi.fn();
const userGroupingReconcileRunPreflight = vi.fn();
const configGetAnimeDbVersion = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			grouping: {
				getState: userGroupingGetState,
			},
			groupingReconcile: {
				runPreflight: userGroupingReconcileRunPreflight,
			},
			config:   {
				getAnimeDbVersion: configGetAnimeDbVersion,
			},
		},
	}),
);

const BASE_ITEM = {
	animeGroupId:     10,
	animeGroupName:   "Group A",
	animeBaseMediaId: 100,
	userGroupId:      null,
	newMediaIds:      [],
	conflictReason:   null,
	conflictAutoApplyBehavior: null,
	conflictRecommendedAction: null,
} as const;

describe(
	"GroupReconcilePreflightService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"returns the full persisted report for user grouping mode",
			async () => {
				const now = 1_700_000_000_000;
				userGroupingGetState.mockReturnValue({
					groupingMode: "user",
					forkedFromAnimeDbVersion: "v1.0",
				});
				configGetAnimeDbVersion.mockReturnValue("v2.0");
				userGroupingReconcileRunPreflight.mockReturnValue({
					runId:     42,
					startedAt: now,
					completedAt: now + 50,
					items:     [
						{
							...BASE_ITEM,
							groupLineageId: 1,
							classification: "new_group",
						},
					],
					summary:   {
						newGroups:           1,
						newMediaInCleanLineages: 0,
						cleanLineages:       0,
						userDeletedLineages: 0,
						conflicts:           0,
						totalNewMediaCount:  0,
					},
				});

				const { GroupReconcilePreflightService } = await import("./group-reconcile-preflight-service");
				const report = GroupReconcilePreflightService.runPreflight();

				expect(userGroupingReconcileRunPreflight).toHaveBeenCalledWith(
					"v1.0",
					"v2.0",
				);
				expect(report).toEqual({
					runId:            42,
					fromAnimeDbVersion: "v1.0",
					toAnimeDbVersion: "v2.0",
					startedAt:        now,
					completedAt:      now + 50,
					items:            [
						{
							...BASE_ITEM,
							groupLineageId: 1,
							classification: "new_group",
						},
					],
					summary:          {
						newGroups:           1,
						newMediaInCleanLineages: 0,
						cleanLineages:       0,
						userDeletedLineages: 0,
						conflicts:           0,
						totalNewMediaCount:  0,
					},
				});
			},
		);

		it(
			"rejects preflight when the current anime DB is not version-stamped",
			async () => {
				userGroupingGetState.mockReturnValue({
					groupingMode: "user",
					forkedFromAnimeDbVersion: null,
				});
				configGetAnimeDbVersion.mockReturnValue(null);

				const { GroupReconcilePreflightService } = await import("./group-reconcile-preflight-service");
				expect(() => GroupReconcilePreflightService.runPreflight()).toThrow(
					"Reconcile preflight requires a configured anime DB version.",
				);
				expect(userGroupingReconcileRunPreflight).not.toHaveBeenCalled();
			},
		);

		it(
			"rejects preflight requests outside user grouping mode",
			async () => {
				userGroupingGetState.mockReturnValue({
					groupingMode: "anime",
					forkedFromAnimeDbVersion: null,
				});

				const { GroupReconcilePreflightService } = await import("./group-reconcile-preflight-service");
				expect(() => GroupReconcilePreflightService.runPreflight()).toThrow(
					"Reconcile preflight requires user grouping mode.",
				);
				expect(userGroupingReconcileRunPreflight).not.toHaveBeenCalled();
			},
		);

		it(
			"re-throws errors from the DB layer so the IPC wrapper can handle them",
			async () => {
				userGroupingGetState.mockReturnValue({
					groupingMode: "user",
					forkedFromAnimeDbVersion: null,
				});
				configGetAnimeDbVersion.mockReturnValue("v2.0");
				userGroupingReconcileRunPreflight.mockImplementation(() => {
					throw new Error("DB error");
				});

				const { GroupReconcilePreflightService } = await import("./group-reconcile-preflight-service");
				expect(() => GroupReconcilePreflightService.runPreflight()).toThrow("DB error");
			},
		);
	},
);
