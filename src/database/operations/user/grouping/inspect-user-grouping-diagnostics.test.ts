// @vitest-environment node
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

const inspectAttachedAnimeDbReconcileSafetyMock = vi.fn();

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

vi.mock(
	"../../anime/metadata/validate-anime-db-reconcile-safety",
	() => ({
		inspectAttachedAnimeDbReconcileSafety: inspectAttachedAnimeDbReconcileSafetyMock,
	}),
);

function createMockDatabase(params: {
	stateRow: {
		id: 1;
		groupingMode: "anime" | "user";
		forkedFromAnimeDbVersion: string | null;
		lastReconciledAnimeDbVersion: string | null;
		lastReconciledAt: number | null;
		lastReconcileStatus: string | null;
		lastReconcileSummaryJson: string | null;
	};
	aggregateRow: Record<string, number>;
	latestRunRow?: {
		id: number;
		fromAnimeDbVersion: string | null;
		toAnimeDbVersion: string;
		startedAt: number;
		completedAt: number | null;
		status: string;
		summaryJson: string | null;
	} | null;
}) {
	return {
		prepare: vi.fn((sql: string) => ({
			get: vi.fn(() => {
				if (sql.includes("FROM userGroupingState")) {
					return params.stateRow;
				}
				if (sql.includes("snapshotResidueInAnimeModeCount")) {
					return params.aggregateRow;
				}
				if (sql.includes("FROM userGroupingReconcileRuns")) {
					return params.latestRunRow ?? undefined;
				}

				throw new Error(`Unexpected SQL in inspect-user-grouping-diagnostics test: ${ sql }`);
			}),
		})),
	};
}

describe(
	"inspectUserGroupingDiagnostics",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"returns a clean diagnostics report with no issue labels",
			async () => {
				getDatabaseMock.mockReturnValue(createMockDatabase({
					stateRow:     {
						id:                       1,
						groupingMode:             "user",
						forkedFromAnimeDbVersion: "v1",
						lastReconciledAnimeDbVersion: "v2",
						lastReconciledAt:         123,
						lastReconcileStatus:      "completed",
						lastReconcileSummaryJson: "{\"ok\":true}",
					},
					aggregateRow: {
						userGroupCount:                                  3,
						userGroupMediaLinkCount:                         4,
						distinctMediaInUserGroupsCount:                  4,
						lineageCount:                                    3,
						activeLineageCount:                              3,
						deletedLineageCount:                             0,
						mergedLineageCount:                              0,
						activeUserLineagesMissingCurrentAnimeLineageCount: 0,
						activeUserLineagesMissingCurrentAnimeGroupCount: 0,
						reconcileRunCount:                               1,
						pendingConflictCount:                            0,
						supersededConflictCount:                         0,
						otherConflictResolutionCount:                    0,
						snapshotResidueInAnimeModeCount:                 0,
						userModeMissingForkVersionCount:                 0,
						userGroupsMissingLineageIdCount:                 0,
						userGroupsWithoutMediaCount:                     0,
						mediasWithMultipleUserGroupsCount:               0,
						activeLineagesMissingUserGroupCount:             0,
						inactiveLineagesStillMappedCount:                0,
						groupStatesWithoutLineageCount:                  0,
						groupIntegrationSnapshotsWithoutLineageCount:    0,
						pendingConflictsFromNonLatestRunCount:           0,
						lastReconcileVersionMismatchCount:               0,
						lastReconcileStatusMismatchCount:                0,
					},
					latestRunRow: {
						id:               7,
						fromAnimeDbVersion: "v1",
						toAnimeDbVersion: "v2",
						startedAt:        100,
						completedAt:      120,
						status:           "completed",
						summaryJson:      "{\"runId\":7}",
					},
				}));
				inspectAttachedAnimeDbReconcileSafetyMock.mockReturnValue({
					groupLineageCount:                    3,
					officialGroupCount:                   3,
					lineagesMissingBaseMediaRecordCount:  0,
					lineagesMissingBaseMediaAniListIdCount: 0,
					groupsMissingLineageCount:            0,
					groupsMissingBaseMediaRecordCount:    0,
					groupsMissingBaseMediaAniListIdCount: 0,
					groupsWithBaseMediaMismatchCount:     0,
				});

				const { inspectUserGroupingDiagnostics } = await import("./inspect-user-grouping-diagnostics");
				const diagnostics = inspectUserGroupingDiagnostics();

				expect(diagnostics.hasIssues).toBe(false);
				expect(diagnostics.issueLabels).toEqual([]);
				expect(diagnostics.counts.userGroupCount).toBe(3);
				expect(diagnostics.latestReconcileRun?.id).toBe(7);
				expect(diagnostics.animeDbReconcileSafety.groupsWithBaseMediaMismatchCount).toBe(0);
			},
		);

		it(
			"builds issue labels for non-zero consistency counts",
			async () => {
				getDatabaseMock.mockReturnValue(createMockDatabase({
					stateRow:     {
						id:                       1,
						groupingMode:             "anime",
						forkedFromAnimeDbVersion: null,
						lastReconciledAnimeDbVersion: "v4",
						lastReconciledAt:         456,
						lastReconcileStatus:      "failed",
						lastReconcileSummaryJson: "{\"error\":\"boom\"}",
					},
					aggregateRow: {
						userGroupCount:                                  1,
						userGroupMediaLinkCount:                         1,
						distinctMediaInUserGroupsCount:                  1,
						lineageCount:                                    1,
						activeLineageCount:                              1,
						deletedLineageCount:                             0,
						mergedLineageCount:                              0,
						activeUserLineagesMissingCurrentAnimeLineageCount: 1,
						activeUserLineagesMissingCurrentAnimeGroupCount: 1,
						reconcileRunCount:                               2,
						pendingConflictCount:                            1,
						supersededConflictCount:                         0,
						otherConflictResolutionCount:                    0,
						snapshotResidueInAnimeModeCount:                 3,
						userModeMissingForkVersionCount:                 0,
						userGroupsMissingLineageIdCount:                 1,
						userGroupsWithoutMediaCount:                     1,
						mediasWithMultipleUserGroupsCount:               1,
						activeLineagesMissingUserGroupCount:             1,
						inactiveLineagesStillMappedCount:                1,
						groupStatesWithoutLineageCount:                  1,
						groupIntegrationSnapshotsWithoutLineageCount:    1,
						pendingConflictsFromNonLatestRunCount:           1,
						lastReconcileVersionMismatchCount:               1,
						lastReconcileStatusMismatchCount:                1,
					},
					latestRunRow: {
						id:               9,
						fromAnimeDbVersion: "v2",
						toAnimeDbVersion: "v3",
						startedAt:        200,
						completedAt:      250,
						status:           "completed",
						summaryJson:      "{\"runId\":9}",
					},
				}));
				inspectAttachedAnimeDbReconcileSafetyMock.mockReturnValue({
					groupLineageCount:                    3,
					officialGroupCount:                   2,
					lineagesMissingBaseMediaRecordCount:  0,
					lineagesMissingBaseMediaAniListIdCount: 0,
					groupsMissingLineageCount:            1,
					groupsMissingBaseMediaRecordCount:    0,
					groupsMissingBaseMediaAniListIdCount: 0,
					groupsWithBaseMediaMismatchCount:     0,
				});

				const { inspectUserGroupingDiagnostics } = await import("./inspect-user-grouping-diagnostics");
				const diagnostics = inspectUserGroupingDiagnostics();

				expect(diagnostics.hasIssues).toBe(true);
				expect(diagnostics.issueLabels).toEqual(expect.arrayContaining([
					"snapshotResidueInAnimeModeCount=3",
					"userGroupsMissingLineageIdCount=1",
					"lastReconcileVersionMismatchCount=1",
					"lastReconcileStatusMismatchCount=1",
					"groupsMissingLineageCount=1",
				]));
				expect(diagnostics.latestReconcileRun).toMatchObject({
					id:     9,
					status: "completed",
					toAnimeDbVersion: "v3",
				});
				expect(diagnostics.issueCounts.pendingConflictsFromNonLatestRunCount).toBe(1);
				expect(diagnostics.counts.activeUserLineagesMissingCurrentAnimeGroupCount).toBe(1);
			},
		);

		it(
			"marks diagnostics as problematic when anime DB reconcile safety counters are non-zero",
			async () => {
				getDatabaseMock.mockReturnValue(createMockDatabase({
					stateRow:     {
						id:                       1,
						groupingMode:             "user",
						forkedFromAnimeDbVersion: "v5",
						lastReconciledAnimeDbVersion: null,
						lastReconciledAt:         null,
						lastReconcileStatus:      null,
						lastReconcileSummaryJson: null,
					},
					aggregateRow: {
						userGroupCount:                                  2,
						userGroupMediaLinkCount:                         2,
						distinctMediaInUserGroupsCount:                  2,
						lineageCount:                                    2,
						activeLineageCount:                              2,
						deletedLineageCount:                             0,
						mergedLineageCount:                              0,
						activeUserLineagesMissingCurrentAnimeLineageCount: 0,
						activeUserLineagesMissingCurrentAnimeGroupCount: 0,
						reconcileRunCount:                               0,
						pendingConflictCount:                            0,
						supersededConflictCount:                         0,
						otherConflictResolutionCount:                    0,
						snapshotResidueInAnimeModeCount:                 0,
						userModeMissingForkVersionCount:                 0,
						userGroupsMissingLineageIdCount:                 0,
						userGroupsWithoutMediaCount:                     0,
						mediasWithMultipleUserGroupsCount:               0,
						activeLineagesMissingUserGroupCount:             0,
						inactiveLineagesStillMappedCount:                0,
						groupStatesWithoutLineageCount:                  0,
						groupIntegrationSnapshotsWithoutLineageCount:    0,
						pendingConflictsFromNonLatestRunCount:           0,
						lastReconcileVersionMismatchCount:               0,
						lastReconcileStatusMismatchCount:                0,
					},
					latestRunRow: null,
				}));
				inspectAttachedAnimeDbReconcileSafetyMock.mockReturnValue({
					groupLineageCount:                    2,
					officialGroupCount:                   2,
					lineagesMissingBaseMediaRecordCount:  0,
					lineagesMissingBaseMediaAniListIdCount: 0,
					groupsMissingLineageCount:            0,
					groupsMissingBaseMediaRecordCount:    0,
					groupsMissingBaseMediaAniListIdCount: 0,
					groupsWithBaseMediaMismatchCount:     2,
				});

				const { inspectUserGroupingDiagnostics } = await import("./inspect-user-grouping-diagnostics");
				const diagnostics = inspectUserGroupingDiagnostics();

				expect(diagnostics.hasIssues).toBe(true);
				expect(diagnostics.issueLabels).toContain("groupsWithBaseMediaMismatchCount=2");
				expect(diagnostics.issueCounts.userGroupsMissingLineageIdCount).toBe(0);
			},
		);
	},
);
