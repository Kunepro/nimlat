// @vitest-environment node
import type { ReconcileLineageItem } from "@nimlat/types/anime-db-reconcile";
import type { Database } from "better-sqlite3";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const { getDatabaseMock } = vi.hoisted(() => ({
	getDatabaseMock: vi.fn(),
}));

const runAndPersistReconcilePreflightMock = vi.fn();
const importAnimeGroupLineageIntoUserSnapshotInternalMock = vi.fn();
const assignMediasToUserGroupInternalMock = vi.fn();
const getUserGroupingStateMock                          = vi.fn();
const repairAndAssertAttachedAnimeDbReconcileSafetyMock = vi.fn();
const logGroupingDiagnosticsIfDebuggingEnabledMock      = vi.fn();

vi.mock(
	"../../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

vi.mock(
	"./reconcile-run-operations",
	() => ({
		runAndPersistReconcilePreflight: runAndPersistReconcilePreflightMock,
	}),
);

vi.mock(
	"./import-anime-group-lineage-into-user-snapshot",
	() => ({
		importAnimeGroupLineageIntoUserSnapshotInternal: importAnimeGroupLineageIntoUserSnapshotInternalMock,
	}),
);

vi.mock(
	"../assign-medias-to-user-group",
	() => ({
		assignMediasToUserGroupInternal: assignMediasToUserGroupInternalMock,
	}),
);

vi.mock(
	"../user-grouping-state",
	() => ({
		getUserGroupingState: getUserGroupingStateMock,
	}),
);

vi.mock(
	"../../../anime/metadata/validate-anime-db-reconcile-safety",
	() => ({
		repairAndAssertAttachedAnimeDbReconcileSafety: repairAndAssertAttachedAnimeDbReconcileSafetyMock,
	}),
);

vi.mock(
	"../log-grouping-diagnostics-if-debugging-enabled",
	() => ({
		logGroupingDiagnosticsIfDebuggingEnabled: logGroupingDiagnosticsIfDebuggingEnabledMock,
	}),
);

function createApplyDb() {
	const lineageSeenUpdates: Array<{
		groupLineageId: number;
		toAnimeDbVersion: string;
		lastAutoImportedAt: number | null;
	}> = [];
	const groupingStates: Array<{
		groupingMode: string;
		forkedFromAnimeDbVersion: string | null;
		lastReconciledAnimeDbVersion: string | null;
		lastReconciledAt: number | null;
		lastReconcileStatus: string | null;
		lastReconcileSummaryJson: string | null;
	}> = [];

	return {
		lineageSeenUpdates,
		groupingStates,
		db: {
					prepare:     (sql: string) => {
						if (sql.includes("UPDATE userGroupLineages")) {
							return {
								run: (toAnimeDbVersion: string, lastAutoImportedAt: number | null, groupLineageId: number) => {
									lineageSeenUpdates.push({
										groupLineageId,
										toAnimeDbVersion,
										lastAutoImportedAt,
									});
								},
							};
						}

						if (sql.includes("INSERT INTO userGroupingState")) {
							return {
								run: (
											 _id: 1,
							         groupingMode: string,
							         forkedFromAnimeDbVersion: string | null,
							         lastReconciledAnimeDbVersion: string | null,
							         lastReconciledAt: number | null,
							         lastReconcileStatus: string | null,
							         lastReconcileSummaryJson: string | null,
										 ) => {
									groupingStates.push({
										groupingMode,
										forkedFromAnimeDbVersion,
										lastReconciledAnimeDbVersion,
										lastReconciledAt,
										lastReconcileStatus,
										lastReconcileSummaryJson,
									});
								},
							};
						}

						throw new Error(`Unexpected SQL in apply-safe reconcile test: ${ sql }`);
					},
					transaction: (callback: () => unknown) => () => {
						const lineageUpdateCount = lineageSeenUpdates.length;
						const groupingStateCount = groupingStates.length;
						try {
							return callback();
						} catch (error) {
							// Preserve the rollback semantics relied on from better-sqlite3 so
							// failure-path assertions cannot accidentally accept partial writes.
							lineageSeenUpdates.splice(lineageUpdateCount);
							groupingStates.splice(groupingStateCount);
							throw error;
						}
					},
				} as unknown as Database,
	};
}

const BASE_ITEM: Omit<ReconcileLineageItem, "groupLineageId" | "classification"> = {
	animeGroupId:     10,
	animeGroupName:   "Group",
	animeBaseMediaId: 100,
	userGroupId:      null,
	newMediaIds:      [],
	conflictReason:   null,
	conflictAutoApplyBehavior: null,
	conflictRecommendedAction: null,
};

describe(
	"applySafeUserGroupingReconcile",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			getUserGroupingStateMock.mockReturnValue({
				groupingMode: "user",
			});
		});

		it(
			"imports new upstream groups and skips deleted, merged, and removed-lineage conflicts safely",
			async () => {
				const {
								db,
								lineageSeenUpdates,
								groupingStates,
							} = createApplyDb();
				getDatabaseMock.mockReturnValue(db);
				const preflightItems: ReconcileLineageItem[] = [
					{
						...BASE_ITEM,
						groupLineageId: 1,
						classification: "new_group",
						animeGroupId: 11,
					},
					{
						...BASE_ITEM,
						groupLineageId: 2,
						classification: "new_media_in_clean_lineage",
						animeGroupId: 12,
						userGroupId:  22,
						newMediaIds:  [
							202,
							203,
						],
					},
					{
						...BASE_ITEM,
						groupLineageId: 3,
						classification: "clean_lineage",
						animeGroupId: 13,
						userGroupId:  23,
					},
					{
						...BASE_ITEM,
						groupLineageId: 4,
						classification: "user_deleted_lineage",
						animeGroupId: 14,
					},
					{
						...BASE_ITEM,
						groupLineageId: 5,
						classification: "conflict",
						animeGroupId:   15,
						userGroupId:    25,
						conflictReason: "lineage_merged",
						conflictAutoApplyBehavior: "skip_blocking",
						conflictRecommendedAction: "review_and_restore_lineage",
					},
					{
						...BASE_ITEM,
						groupLineageId: 6,
						classification: "conflict",
						animeGroupId:   null,
						userGroupId:    26,
						conflictReason: "upstream_lineage_removed",
						conflictAutoApplyBehavior: "skip_warn",
						conflictRecommendedAction: "review_upstream_grouping_change",
					},
				];
				runAndPersistReconcilePreflightMock.mockReturnValue({
					runId:     88,
					startedAt: 1_700_000_000_000,
					completedAt: 1_700_000_000_050,
					items:     preflightItems,
					summary:   {
						newGroups:           1,
						newMediaInCleanLineages: 1,
						cleanLineages:       1,
						userDeletedLineages: 1,
						conflicts:           2,
						totalNewMediaCount:  3,
					},
				});
				importAnimeGroupLineageIntoUserSnapshotInternalMock.mockReturnValue({
					groupId: 41,
					importedMediaIds: [ 301 ],
				});

				const { applySafeUserGroupingReconcile } = await import("./apply-safe-user-grouping-reconcile");
				const result                                 = applySafeUserGroupingReconcile({
					fromAnimeDbVersion: "v1",
					toAnimeDbVersion: "v2",
				});

				expect(runAndPersistReconcilePreflightMock).toHaveBeenCalledWith({
					fromAnimeDbVersion:     "v1",
					toAnimeDbVersion:       "v2",
					readClassifiedLineages: expect.any(Function),
				});
				expect(importAnimeGroupLineageIntoUserSnapshotInternalMock).toHaveBeenCalledWith(
					db,
					expect.objectContaining({
						groupLineageId: 1,
						toAnimeDbVersion: "v2",
					}),
				);
				expect(assignMediasToUserGroupInternalMock).toHaveBeenCalledWith(
					db,
					22,
					[
						202,
						203,
					],
				);
				expect(result.impact).toEqual({
					affectedMediaIds: [
						301,
						202,
						203,
					],
					affectedGroupIds: [
						41,
						22,
					],
				});
				expect(result.report.preflightSummary).toEqual({
					newGroups:           1,
					newMediaInCleanLineages: 1,
					cleanLineages:       1,
					userDeletedLineages: 1,
					conflicts:           2,
					totalNewMediaCount:  3,
				});
				expect(result.report.applySummary).toEqual({
					newGroupsImported:          1,
					existingLineagesUpdatedWithNewMedias: 1,
					importedMediaCount:         3,
					cleanLineagesMarkedSeen:    1,
					userDeletedLineagesSkipped: 1,
					conflictsSkipped:           2,
				});
				expect(lineageSeenUpdates.map(update => update.groupLineageId)).toEqual([
					2,
					3,
					4,
					5,
				]);
				expect(lineageSeenUpdates.find(update => update.groupLineageId === 2)?.lastAutoImportedAt).toEqual(
					expect.any(Number),
				);
				expect(lineageSeenUpdates.find(update => update.groupLineageId === 3)?.lastAutoImportedAt).toBeNull();
				expect(lineageSeenUpdates.find(update => update.groupLineageId === 4)?.lastAutoImportedAt).toBeNull();
				expect(lineageSeenUpdates.find(update => update.groupLineageId === 5)?.lastAutoImportedAt).toBeNull();
				expect(lineageSeenUpdates.some(update => update.groupLineageId === 6)).toBe(false);
				expect(groupingStates.at(-1)).toEqual({
					groupingMode:             "user",
					forkedFromAnimeDbVersion: "v1",
					lastReconciledAnimeDbVersion: "v2",
					lastReconciledAt:         expect.any(Number),
					lastReconcileStatus:      "completed",
					lastReconcileSummaryJson: expect.any(String),
				});
				expect(
					JSON.parse(groupingStates.at(-1)?.lastReconcileSummaryJson ?? "{}"),
				).toMatchObject({
					runId:        88,
					preflightSummary: {
						conflicts: 2,
					},
					applySummary: {
						conflictsSkipped: 2,
						userDeletedLineagesSkipped: 1,
					},
				});
			},
		);

		it(
			"rejects apply outside user grouping mode before safety checks or writes",
			async () => {
				getUserGroupingStateMock.mockReturnValue({ groupingMode: "anime" });
				const { applySafeUserGroupingReconcile } = await import("./apply-safe-user-grouping-reconcile");

				expect(() => applySafeUserGroupingReconcile({
					fromAnimeDbVersion: "v1",
					toAnimeDbVersion:   "v2",
				})).toThrow("Reconcile apply requires user grouping mode.");
				expect(repairAndAssertAttachedAnimeDbReconcileSafetyMock).not.toHaveBeenCalled();
				expect(runAndPersistReconcilePreflightMock).not.toHaveBeenCalled();
			},
		);

		it(
			"rejects an unsafe attached AnimeDB before preflight or user grouping writes",
			async () => {
				repairAndAssertAttachedAnimeDbReconcileSafetyMock.mockImplementationOnce(() => {
					throw new Error("unsafe canonical identities");
				});
				const { applySafeUserGroupingReconcile } = await import("./apply-safe-user-grouping-reconcile");

				expect(() => applySafeUserGroupingReconcile({
					fromAnimeDbVersion: "v1",
					toAnimeDbVersion:   "v2",
				})).toThrow("unsafe canonical identities");
				expect(runAndPersistReconcilePreflightMock).not.toHaveBeenCalled();
				expect(importAnimeGroupLineageIntoUserSnapshotInternalMock).not.toHaveBeenCalled();
				expect(assignMediasToUserGroupInternalMock).not.toHaveBeenCalled();
			},
		);

		it(
			"rolls back earlier safe writes and records a retryable failure when a later import fails",
			async () => {
				const {
								db,
								lineageSeenUpdates,
								groupingStates,
							} = createApplyDb();
				getDatabaseMock.mockReturnValue(db);
				runAndPersistReconcilePreflightMock.mockReturnValue({
					runId:       99,
					startedAt:   1_700_000_000_000,
					completedAt: 1_700_000_000_050,
					items:       [
						{
							...BASE_ITEM,
							groupLineageId: 1,
							classification: "clean_lineage",
							userGroupId:    21,
						},
						{
							...BASE_ITEM,
							groupLineageId: 2,
							classification: "new_media_in_clean_lineage",
							userGroupId:    22,
							newMediaIds:    [ 202 ],
						},
					],
					summary:     {
						newGroups:               0,
						newMediaInCleanLineages: 1,
						cleanLineages:           1,
						userDeletedLineages:     0,
						conflicts:               0,
						totalNewMediaCount:      1,
					},
				});
				assignMediasToUserGroupInternalMock.mockImplementationOnce(() => {
					throw new Error("simulated insert constraint failure");
				});
				const { applySafeUserGroupingReconcile } = await import("./apply-safe-user-grouping-reconcile");

				expect(() => applySafeUserGroupingReconcile({
					fromAnimeDbVersion: "v1",
					toAnimeDbVersion:   "v2",
				})).toThrow("simulated insert constraint failure");

				// The clean-lineage marker ran first inside the transaction, but the
				// later failure must roll it back with every other apply mutation.
				expect(lineageSeenUpdates).toEqual([]);
				expect(groupingStates).toHaveLength(1);
				expect(groupingStates[ 0 ]).toMatchObject({
					groupingMode:                 "user",
					forkedFromAnimeDbVersion:     "v1",
					lastReconciledAnimeDbVersion: "v2",
					lastReconcileStatus:          "failed",
				});
				expect(JSON.parse(groupingStates[ 0 ].lastReconcileSummaryJson ?? "{}")).toMatchObject({
					runId: 99,
					error: expect.stringContaining("simulated insert constraint failure"),
				});
				expect(logGroupingDiagnosticsIfDebuggingEnabledMock).not.toHaveBeenCalled();
			},
		);
	},
);
