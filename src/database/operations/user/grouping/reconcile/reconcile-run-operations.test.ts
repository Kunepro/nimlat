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
import { classifyReconcileLineages } from "./classify-reconcile-lineages";
import {
	buildReconcileConflictInputs,
	buildReconcilePreflightSummary,
} from "./reconcile-run-model";
import { runAndPersistReconcilePreflight } from "./reconcile-run-operations";

const { getDatabaseMock } = vi.hoisted(() => ({
	getDatabaseMock: vi.fn(),
}));

vi.mock(
	"../../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

type LineageMetaRow = {
	groupLineageId: number;
	animeBaseMediaId: number;
	animeGroupId: number | null;
	animeGroupName: string | null;
	knownInUser: 0 | 1;
	userGroupId: number | null;
	userLineageStatus: "active" | "deleted" | "merged" | null;
	lastUserModifiedAt: number | null;
	isUserCreated: 0 | 1 | null;
	collisionUserGroupId: number | null;
	collisionIsUserCreated: 0 | 1 | null;
};

// Build a minimal fake DB object that serves the exact query shapes used by
// `classifyReconcileLineages` without needing a native better-sqlite3 runtime in Vitest.
function createClassifierDb(params: {
	rows: LineageMetaRow[];
	missingUpstreamGroupRows?: Array<{
		groupLineageId: number;
		bestKnownBaseMediaId: number;
		userGroupId: number | null;
	}>;
	missingUpstreamRows?: Array<{
		groupLineageId: number;
		bestKnownBaseMediaId: number;
		userGroupId: number | null;
	}>;
	userOnlyMediaIdsByPair: Map<string, number[]>;
	animeOnlyMediaIdsByPair: Map<string, number[]>;
	missingAnimeMediaIds?: Set<number>;
}): Database {
	return {
		prepare: (sql: string) => {
			if (sql.includes("FROM anime_data.groups g")) {
				return {
					all: () => params.rows,
				};
			}

			if (sql.includes("gl.groupLineageId IS NOT NULL")) {
				return {
					all: () => params.missingUpstreamGroupRows ?? [],
				};
			}

			if (sql.includes("gl.groupLineageId IS NULL")) {
				return {
					all: () => params.missingUpstreamRows ?? [],
				};
			}

			if (sql.includes("SELECT ugm.mediaId")) {
				return {
					all: (userGroupId: number, animeGroupId: number) => (
						params.userOnlyMediaIdsByPair.get(`${ userGroupId }:${ animeGroupId }`) ?? []
					).map(mediaId => ({ mediaId })),
				};
			}

			if (sql.includes("SELECT agm.mediaId")) {
				return {
					all: (animeGroupId: number, userGroupId: number) => (
						params.animeOnlyMediaIdsByPair.get(`${ animeGroupId }:${ userGroupId }`) ?? []
					).map(mediaId => ({ mediaId })),
				};
			}

			if (sql.includes("SELECT 1 AS existsFlag")) {
				return {
					get: (mediaId: number) => params.missingAnimeMediaIds?.has(mediaId)
						? undefined
						: { existsFlag: 1 as const },
				};
			}

			throw new Error(`Unexpected SQL in classifier test: ${ sql }`);
		},
	} as unknown as Database;
}

// Build a fake DB object for `runAndPersistReconcilePreflight` and capture the persisted writes
// so the test can verify summary/conflict storage behavior.
function createRunPersistenceDb() {
	const insertedConflictRows: Array<{
		runId: number;
		conflictType: string;
		groupLineageId: number | null;
		mediaId: number | null;
		userGroupId: number | null;
		payloadJson: string;
	}> = [];
	const completedRuns: Array<{
		runId: number;
		completedAt: number;
		status: string;
		summaryJson: string;
	}> = [];

	const db = {
		prepare: (sql: string) => {
			if (sql.includes("INSERT INTO userGroupingReconcileRuns")) {
				return {
					run: () => ({
						lastInsertRowid: 77,
					}),
				};
			}

			if (sql.includes("UPDATE userGroupingReconcileRuns")) {
				return {
					run: (completedAt: number, status: string, summaryJson: string, runId: number) => {
						completedRuns.push({
							runId,
							completedAt,
							status,
							summaryJson,
						});
						return {};
					},
				};
			}

			if (sql.includes("INSERT INTO userGroupingReconcileConflicts")) {
				return {
					run: (
								 runId: number,
						     conflictType: string,
						     groupLineageId: number | null,
						     mediaId: number | null,
						     userGroupId: number | null,
						     payloadJson: string,
							 ) => {
						insertedConflictRows.push({
							runId,
							conflictType,
							groupLineageId,
							mediaId,
							userGroupId,
							payloadJson,
						});
						return {};
					},
				};
			}

			throw new Error(`Unexpected SQL in run persistence test: ${ sql }`);
		},
		transaction: (callback: () => void) => () => callback(),
	} as unknown as Database;

	return {
		db,
		insertedConflictRows,
		completedRuns,
	};
}

describe(
	"reconcile preflight helpers",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"classifies clean, new-media, deleted, conflict, and new-group lineages",
			() => {
				const db = createClassifierDb({
					rows:                    [
						{
							groupLineageId:       1,
							animeBaseMediaId:     101,
							animeGroupId:         11,
							animeGroupName:       "Clean Group",
							knownInUser:          1,
							userGroupId:          21,
							userLineageStatus:    "active",
							lastUserModifiedAt:   null,
							isUserCreated:        0,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
						{
							groupLineageId:       2,
							animeBaseMediaId:     201,
							animeGroupId:         12,
							animeGroupName:       "New Media Group",
							knownInUser:          1,
							userGroupId:          22,
							userLineageStatus:    "active",
							lastUserModifiedAt:   null,
							isUserCreated:        0,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
						{
							groupLineageId:       3,
							animeBaseMediaId:     301,
							animeGroupId:         13,
							animeGroupName:       "Deleted Group",
							knownInUser:          1,
							userGroupId:          null,
							userLineageStatus:    "deleted",
							lastUserModifiedAt:   null,
							isUserCreated:        null,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
						{
							groupLineageId:       4,
							animeBaseMediaId:     401,
							animeGroupId:         14,
							animeGroupName:       "Drift Group",
							knownInUser:          1,
							userGroupId:          24,
							userLineageStatus:    "active",
							lastUserModifiedAt:   null,
							isUserCreated:        0,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
						{
							groupLineageId:       5,
							animeBaseMediaId:     501,
							animeGroupId:         15,
							animeGroupName:       "Brand New Group",
							knownInUser:          0,
							userGroupId:          null,
							userLineageStatus:    null,
							lastUserModifiedAt:   null,
							isUserCreated:        null,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
					],
					userOnlyMediaIdsByPair:  new Map([
						[
							"21:11",
							[],
						],
						[
							"22:12",
							[],
						],
						[
							"24:14",
							[ 401 ],
						],
					]),
					animeOnlyMediaIdsByPair: new Map([
						[
							"11:21",
							[],
						],
						[
							"12:22",
							[ 202 ],
						],
						[
							"14:24",
							[],
						],
					]),
					missingAnimeMediaIds:    new Set(),
				});

				const itemsByLineageId = new Map(
					classifyReconcileLineages(db).map(item => [
						item.groupLineageId,
						item,
					]),
				);

				expect(itemsByLineageId.get(1)).toMatchObject({
					classification: "clean_lineage",
					newMediaIds:    [],
					conflictReason: null,
					conflictAutoApplyBehavior: null,
					conflictRecommendedAction: null,
				});
				expect(itemsByLineageId.get(2)).toMatchObject({
					classification: "new_media_in_clean_lineage",
					newMediaIds:    [ 202 ],
					conflictReason: null,
					conflictAutoApplyBehavior: null,
					conflictRecommendedAction: null,
				});
				expect(itemsByLineageId.get(3)).toMatchObject({
					classification: "user_deleted_lineage",
					newMediaIds:    [],
					conflictReason: null,
					conflictAutoApplyBehavior: null,
					conflictRecommendedAction: null,
				});
				expect(itemsByLineageId.get(4)).toMatchObject({
					classification: "conflict",
					newMediaIds:    [],
					conflictReason: "lineage_membership_drift",
					conflictAutoApplyBehavior: "skip_blocking",
					conflictRecommendedAction: "review_upstream_grouping_change",
				});
				expect(itemsByLineageId.get(5)).toMatchObject({
					classification: "new_group",
					newMediaIds:    [],
					conflictReason: null,
					conflictAutoApplyBehavior: null,
					conflictRecommendedAction: null,
				});
			},
		);

		it(
			"classifies unknown lineage collisions as conflicts and active user lineages missing a concrete upstream group row",
			() => {
				const db = createClassifierDb({
					rows:                     [
						{
							groupLineageId:       6,
							animeBaseMediaId:     601,
							animeGroupId:         16,
							animeGroupName:       "Colliding Group",
							knownInUser:          0,
							userGroupId:          null,
							userLineageStatus:    null,
							lastUserModifiedAt:   null,
							isUserCreated:        null,
							collisionUserGroupId: 26,
							collisionIsUserCreated: 1,
						},
						{
							groupLineageId:       7,
							animeBaseMediaId:     701,
							animeGroupId:         17,
							animeGroupName:       "Imported Collision Group",
							knownInUser:          0,
							userGroupId:          null,
							userLineageStatus:    null,
							lastUserModifiedAt:   null,
							isUserCreated:        null,
							collisionUserGroupId: 27,
							collisionIsUserCreated: 0,
						},
					],
					missingUpstreamGroupRows: [
						{
							groupLineageId: 8,
							bestKnownBaseMediaId: 801,
							userGroupId:    28,
						},
					],
					userOnlyMediaIdsByPair:   new Map(),
					animeOnlyMediaIdsByPair:  new Map(),
					missingAnimeMediaIds:     new Set(),
				});

				const itemsByLineageId = new Map(
					classifyReconcileLineages(db).map(item => [
						item.groupLineageId,
						item,
					]),
				);

				expect(itemsByLineageId.get(6)).toMatchObject({
					classification: "conflict",
					userGroupId:    26,
					conflictReason: "user_created_group",
					conflictAutoApplyBehavior: "skip_blocking",
					conflictRecommendedAction: "review_and_keep_current_grouping",
				});
				expect(itemsByLineageId.get(7)).toMatchObject({
					classification: "conflict",
					userGroupId:    27,
					conflictReason: "lineage_identity_collision",
					conflictAutoApplyBehavior: "skip_blocking",
					conflictRecommendedAction: "review_and_reassign_lineage",
				});
				expect(itemsByLineageId.get(8)).toMatchObject({
					classification: "conflict",
					userGroupId:    28,
					conflictReason: "upstream_group_missing",
					conflictAutoApplyBehavior: "skip_warn",
					conflictRecommendedAction: "review_upstream_grouping_change",
				});
			},
		);

		it(
			"builds persisted reconcile summary and conflict inputs as pure run data",
			() => {
				const items: ReconcileLineageItem[] = [
					{
						groupLineageId:            1,
						classification:            "new_media_in_clean_lineage",
						animeGroupId:              11,
						animeGroupName:            "New Media Group",
						animeBaseMediaId:          101,
						userGroupId:               21,
						newMediaIds:               [
							102,
							103,
						],
						conflictReason:            null,
						conflictAutoApplyBehavior: null,
						conflictRecommendedAction: null,
					},
					{
						groupLineageId:            2,
						classification:            "conflict",
						animeGroupId:              12,
						animeGroupName:            "Drift Group",
						animeBaseMediaId:          201,
						userGroupId:               22,
						newMediaIds:               [],
						conflictReason:            "lineage_membership_drift",
						conflictAutoApplyBehavior: "skip_blocking",
						conflictRecommendedAction: "review_upstream_grouping_change",
					},
				];

				expect(buildReconcilePreflightSummary(items)).toEqual({
					newGroups:               0,
					newMediaInCleanLineages: 1,
					cleanLineages:           0,
					userDeletedLineages:     0,
					conflicts:               1,
					totalNewMediaCount:      2,
				});
				const conflicts = buildReconcileConflictInputs(items);

				expect(conflicts).toHaveLength(1);
				expect(conflicts[ 0 ]).toMatchObject({
					groupLineageId: 2,
					conflictType:   "lineage_membership_drift",
					userGroupId:    22,
				});
				expect(JSON.parse(conflicts[ 0 ].payloadJson)).toMatchObject({
					animeGroupId:      12,
					animeGroupName:    "Drift Group",
					animeBaseMediaId:  201,
					conflictReason:    "lineage_membership_drift",
					autoApplyBehavior: "skip_blocking",
					recommendedAction: "review_upstream_grouping_change",
				});
			},
		);

		it(
			"rejects conflict items that lack manual-review guidance before persistence",
			() => {
				expect(() => buildReconcileConflictInputs([
					{
						groupLineageId:            7,
						classification:            "conflict",
						animeGroupId:              17,
						animeGroupName:            "Invalid Conflict",
						animeBaseMediaId:          701,
						userGroupId:               null,
						newMediaIds:               [],
						conflictReason:            "lineage_membership_drift",
						conflictAutoApplyBehavior: null,
						conflictRecommendedAction: null,
					},
				])).toThrow("Conflict lineage 7 is missing handling guidance.");
			},
		);

		it(
			"classifies reshaped memberships separately from one-sided drift",
			() => {
				const db = createClassifierDb({
					rows:                    [
						{
							groupLineageId:       9,
							animeBaseMediaId:     901,
							animeGroupId:         19,
							animeGroupName:       "Reshaped Group",
							knownInUser:          1,
							userGroupId:          29,
							userLineageStatus:    "active",
							lastUserModifiedAt:   null,
							isUserCreated:        0,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
					],
					userOnlyMediaIdsByPair:  new Map([
						[
							"29:19",
							[ 901 ],
						],
					]),
					animeOnlyMediaIdsByPair: new Map([
						[
							"19:29",
							[ 902 ],
						],
					]),
					missingAnimeMediaIds:    new Set(),
				});

				const item = classifyReconcileLineages(db)[ 0 ];

				expect(item).toMatchObject({
					classification: "conflict",
					conflictReason: "lineage_membership_reshaped",
					conflictAutoApplyBehavior: "skip_blocking",
					conflictRecommendedAction: "review_upstream_grouping_change",
				});
			},
		);

		it(
			"classifies merged user lineages as manual-review conflicts",
			() => {
				const db = createClassifierDb({
					rows:                   [
						{
							groupLineageId:       12,
							animeBaseMediaId:     1201,
							animeGroupId:         22,
							animeGroupName:       "Merged Lineage Group",
							knownInUser:          1,
							userGroupId:          32,
							userLineageStatus:    "merged",
							lastUserModifiedAt:   null,
							isUserCreated:        0,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
					],
					userOnlyMediaIdsByPair: new Map(),
					animeOnlyMediaIdsByPair: new Map(),
					missingAnimeMediaIds:   new Set(),
				});

				const item = classifyReconcileLineages(db)[ 0 ];

				expect(item).toMatchObject({
					classification: "conflict",
					userGroupId:    32,
					conflictReason: "lineage_merged",
					conflictAutoApplyBehavior: "skip_blocking",
					conflictRecommendedAction: "review_and_restore_lineage",
				});
			},
		);

		it(
			"classifies missing upstream medias and fully removed upstream lineages as explicit conflicts",
			() => {
				const db = createClassifierDb({
					rows:                    [
						{
							groupLineageId:       10,
							animeBaseMediaId:     1001,
							animeGroupId:         20,
							animeGroupName:       "Missing Media Group",
							knownInUser:          1,
							userGroupId:          30,
							userLineageStatus:    "active",
							lastUserModifiedAt:   null,
							isUserCreated:        0,
							collisionUserGroupId: null,
							collisionIsUserCreated: null,
						},
					],
					missingUpstreamRows:     [
						{
							groupLineageId: 11,
							bestKnownBaseMediaId: 1101,
							userGroupId:    31,
						},
					],
					userOnlyMediaIdsByPair:  new Map([
						[
							"30:20",
							[ 1002 ],
						],
					]),
					animeOnlyMediaIdsByPair: new Map([
						[
							"20:30",
							[],
						],
					]),
					missingAnimeMediaIds:    new Set([ 1002 ]),
				});

				const itemsByLineageId = new Map(
					classifyReconcileLineages(db).map(item => [
						item.groupLineageId,
						item,
					]),
				);

				expect(itemsByLineageId.get(10)).toMatchObject({
					classification: "conflict",
					conflictReason: "upstream_media_removed",
					conflictAutoApplyBehavior: "skip_warn",
					conflictRecommendedAction: "review_upstream_grouping_change",
				});
				expect(itemsByLineageId.get(11)).toMatchObject({
					classification:   "conflict",
					animeGroupId:     null,
					animeBaseMediaId: 1101,
					userGroupId:      31,
					conflictReason:   "upstream_lineage_removed",
					conflictAutoApplyBehavior: "skip_warn",
					conflictRecommendedAction: "review_upstream_grouping_change",
				});
			},
		);

		it(
			"persists the computed summary JSON and conflict rows for a completed preflight run",
			() => {
				const {
								db,
								insertedConflictRows,
								completedRuns,
							} = createRunPersistenceDb();
				getDatabaseMock.mockReturnValue(db);

				const items: ReconcileLineageItem[] = [
					{
						groupLineageId:   1,
						classification:   "clean_lineage",
						animeGroupId:     11,
						animeGroupName:   "Clean Group",
						animeBaseMediaId: 101,
						userGroupId:      21,
						newMediaIds:      [],
						conflictReason:   null,
						conflictAutoApplyBehavior: null,
						conflictRecommendedAction: null,
					},
					{
						groupLineageId:   2,
						classification:   "new_media_in_clean_lineage",
						animeGroupId:     12,
						animeGroupName:   "New Media Group",
						animeBaseMediaId: 201,
						userGroupId:      22,
						newMediaIds:      [ 202 ],
						conflictReason:   null,
						conflictAutoApplyBehavior: null,
						conflictRecommendedAction: null,
					},
					{
						groupLineageId:   3,
						classification:   "user_deleted_lineage",
						animeGroupId:     13,
						animeGroupName:   "Deleted Group",
						animeBaseMediaId: 301,
						userGroupId:      null,
						newMediaIds:      [],
						conflictReason:   null,
						conflictAutoApplyBehavior: null,
						conflictRecommendedAction: null,
					},
					{
						groupLineageId:   4,
						classification:   "conflict",
						animeGroupId:     14,
						animeGroupName:   "Drift Group",
						animeBaseMediaId: 401,
						userGroupId:      24,
						newMediaIds:      [],
						conflictReason:   "lineage_membership_drift",
						conflictAutoApplyBehavior: "skip_blocking",
						conflictRecommendedAction: "review_upstream_grouping_change",
					},
					{
						groupLineageId:   5,
						classification:   "new_group",
						animeGroupId:     15,
						animeGroupName:   "Brand New Group",
						animeBaseMediaId: 501,
						userGroupId:      null,
						newMediaIds:      [],
						conflictReason:   null,
						conflictAutoApplyBehavior: null,
						conflictRecommendedAction: null,
					},
				];

				const result = runAndPersistReconcilePreflight({
					fromAnimeDbVersion:     "v1",
					toAnimeDbVersion:       "v2",
					readClassifiedLineages: () => items,
				});

				expect(result.runId).toBe(77);
				expect(result.summary).toEqual({
					newGroups:           1,
					newMediaInCleanLineages: 1,
					cleanLineages:       1,
					userDeletedLineages: 1,
					conflicts:           1,
					totalNewMediaCount:  1,
				});
				expect(completedRuns).toHaveLength(1);
				expect(completedRuns[ 0 ]).toMatchObject({
					runId: 77,
					status: "completed",
				});
				expect(JSON.parse(completedRuns[ 0 ].summaryJson)).toEqual(result.summary);
				expect(insertedConflictRows).toHaveLength(1);
				expect(insertedConflictRows[ 0 ]).toMatchObject({
					runId:        77,
					conflictType: "lineage_membership_drift",
					groupLineageId: 4,
					userGroupId:  24,
				});
				expect(JSON.parse(insertedConflictRows[ 0 ].payloadJson)).toMatchObject({
					animeGroupId:     14,
					animeGroupName:   "Drift Group",
					animeBaseMediaId: 401,
					conflictReason:   "lineage_membership_drift",
					autoApplyBehavior: "skip_blocking",
					recommendedAction: "review_upstream_grouping_change",
				});
			},
		);
	},
);
