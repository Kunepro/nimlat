// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const userGroupingGetState    = vi.fn();
const userGroupingReconcileApplySafeImport = vi.fn();
const configGetAnimeDbVersion = vi.fn();
const handleGroupingMutation  = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			grouping: {
				getState: userGroupingGetState,
			},
			groupingReconcile: {
				applySafeImport: userGroupingReconcileApplySafeImport,
			},
			config:   {
				getAnimeDbVersion: configGetAnimeDbVersion,
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

describe(
	"GroupReconcileApplyService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"applies the safe reconcile import and republishes grouping side effects",
			async () => {
				userGroupingGetState.mockReturnValue({
					groupingMode: "user",
					forkedFromAnimeDbVersion: "v1.0",
				});
				configGetAnimeDbVersion.mockReturnValue("v2.0");
				userGroupingReconcileApplySafeImport.mockReturnValue({
					report: {
						runId:              7,
						fromAnimeDbVersion: "v1.0",
						toAnimeDbVersion:   "v2.0",
						startedAt:          100,
						preflightCompletedAt: 120,
						appliedAt:          150,
						preflightSummary:   {
							newGroups:           1,
							newMediaInCleanLineages: 1,
							cleanLineages:       2,
							userDeletedLineages: 0,
							conflicts:           0,
							totalNewMediaCount:  3,
						},
						applySummary:       {
							newGroupsImported:          1,
							existingLineagesUpdatedWithNewMedias: 1,
							importedMediaCount:         5,
							cleanLineagesMarkedSeen:    2,
							userDeletedLineagesSkipped: 0,
							conflictsSkipped:           0,
						},
					},
					impact: {
						affectedMediaIds: [
							920001,
							920002,
						],
						affectedGroupIds: [
							12,
							13,
						],
					},
				});

				const { GroupReconcileApplyService } = await import("./group-reconcile-apply-service");
				const report = GroupReconcileApplyService.runSafeApply();

				expect(userGroupingReconcileApplySafeImport).toHaveBeenCalledWith(
					"v1.0",
					"v2.0",
				);
				expect(handleGroupingMutation).toHaveBeenCalledWith({
					affectedMediaIds: [
						920001,
						920002,
					],
					affectedGroups:   [
						{
							source:  "user",
							groupId: 12,
						},
						{
							source:  "user",
							groupId: 13,
						},
					],
					context:          "group-reconcile-safe-apply",
				});
				expect(report.runId).toBe(7);
				expect(report.applySummary.importedMediaCount).toBe(5);
			},
		);

		it(
			"rejects safe apply when the anime DB is not version-stamped",
			async () => {
				userGroupingGetState.mockReturnValue({
					groupingMode: "user",
					forkedFromAnimeDbVersion: null,
				});
				configGetAnimeDbVersion.mockReturnValue(null);

				const { GroupReconcileApplyService } = await import("./group-reconcile-apply-service");
				expect(() => GroupReconcileApplyService.runSafeApply()).toThrow(
					"Reconcile apply requires a configured anime DB version.",
				);
				expect(userGroupingReconcileApplySafeImport).not.toHaveBeenCalled();
			},
		);

		it(
			"rejects safe apply requests outside user grouping mode",
			async () => {
				userGroupingGetState.mockReturnValue({
					groupingMode: "anime",
					forkedFromAnimeDbVersion: null,
				});

				const { GroupReconcileApplyService } = await import("./group-reconcile-apply-service");
				expect(() => GroupReconcileApplyService.runSafeApply()).toThrow(
					"Reconcile apply requires user grouping mode.",
				);
				expect(userGroupingReconcileApplySafeImport).not.toHaveBeenCalled();
				expect(handleGroupingMutation).not.toHaveBeenCalled();
			},
		);

		it(
			"re-throws apply errors so the IPC wrapper can translate them",
			async () => {
				userGroupingGetState.mockReturnValue({
					groupingMode: "user",
					forkedFromAnimeDbVersion: "v1.0",
				});
				configGetAnimeDbVersion.mockReturnValue("v2.0");
				userGroupingReconcileApplySafeImport.mockImplementation(() => {
					throw new Error("apply failed");
				});

				const { GroupReconcileApplyService } = await import("./group-reconcile-apply-service");
				expect(() => GroupReconcileApplyService.runSafeApply()).toThrow("apply failed");
				expect(handleGroupingMutation).not.toHaveBeenCalled();
			},
		);
	},
);
