// @vitest-environment node
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

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

type FakeMediaRow = {
	mediaId: number;
	idAniList: number | null;
};

type FakeGroupLineageRow = {
	groupLineageId: number;
	baseMediaId: number | null;
};

type FakeGroupRow = {
	id: number;
	groupLineageId: number;
	baseMediaId: number | null;
};

type FakeAnimeState = {
	media: FakeMediaRow[];
	groupLineages: FakeGroupLineageRow[];
	groups: FakeGroupRow[];
};

function findMedia(state: FakeAnimeState, mediaId: number | null): FakeMediaRow | undefined {
	return typeof mediaId === "number"
		? state.media.find(row => row.mediaId === mediaId)
		: undefined;
}

function findLineage(state: FakeAnimeState, groupLineageId: number): FakeGroupLineageRow | undefined {
	return state.groupLineages.find(row => row.groupLineageId === groupLineageId);
}

function createRepairDb(state: FakeAnimeState): Database {
	return {
		transaction: (fn: () => void) => () => fn(),
		prepare: (sql: string) => {
			if (sql.includes("lineages.groupLineageId IS NULL")) {
				return {
					all: () => state.groups
						.filter((group) => {
							const groupBaseMedia = findMedia(
								state,
								group.baseMediaId,
							);
							return findLineage(
									state,
									group.groupLineageId,
								) == null
								&& groupBaseMedia?.idAniList != null
								&& !state.groupLineages.some(lineage => lineage.baseMediaId === group.baseMediaId);
						})
						.map(group => ({
							groupLineageId: group.groupLineageId,
							candidateBaseMediaId: group.baseMediaId as number,
						})),
				};
			}

			if (sql.includes("INSERT INTO anime_data.groupLineages")) {
				return {
					run: (groupLineageId: number, baseMediaId: number) => {
						state.groupLineages.push({
							groupLineageId,
							baseMediaId,
						});
					},
				};
			}

			if (sql.includes("lineageBaseMedia.mediaId IS NULL")) {
				return {
					all: () => state.groups
						.filter((group) => {
							const lineage        = findLineage(
								state,
								group.groupLineageId,
							);
							const groupBaseMedia = findMedia(
								state,
								group.baseMediaId,
							);
							const lineageBaseMedia = findMedia(
								state,
								lineage?.baseMediaId ?? null,
							);
							return lineage != null
								&& groupBaseMedia?.idAniList != null
								&& (lineage.baseMediaId == null
									|| lineageBaseMedia == null
									|| lineageBaseMedia.idAniList == null)
								&& !state.groupLineages.some(candidate =>
									candidate.baseMediaId === group.baseMediaId
									&& candidate.groupLineageId !== group.groupLineageId);
						})
						.map(group => ({
							groupLineageId: group.groupLineageId,
							candidateBaseMediaId: group.baseMediaId as number,
						})),
				};
			}

			if (sql.includes("UPDATE anime_data.groupLineages")) {
				return {
					run: (baseMediaId: number, groupLineageId: number) => {
						const lineage = findLineage(
							state,
							groupLineageId,
						);
						if (lineage) {
							lineage.baseMediaId = baseMediaId;
						}
					},
				};
			}

			if (sql.includes("conflictingGroup.id <> groups.id")) {
				return {
					all: () => state.groups
						.filter((group) => {
							const lineage = findLineage(
								state,
								group.groupLineageId,
							);
							if (!lineage) {
								return false;
							}

							const lineageBaseMedia = findMedia(
								state,
								lineage.baseMediaId,
							);
							const groupBaseMedia = findMedia(
								state,
								group.baseMediaId,
							);
							return lineageBaseMedia?.idAniList != null
								&& (groupBaseMedia == null
									|| groupBaseMedia.idAniList == null
									|| group.baseMediaId !== lineage.baseMediaId)
								&& !state.groups.some(candidate =>
									candidate.baseMediaId === lineage.baseMediaId
									&& candidate.id !== group.id);
						})
						.map(group => ({
							groupId: group.id,
							candidateBaseMediaId: findLineage(
								state,
								group.groupLineageId,
							)?.baseMediaId as number,
						})),
				};
			}

			if (sql.includes("UPDATE anime_data.groups")) {
				return {
					run: (baseMediaId: number, groupId: number) => {
						const group = state.groups.find(row => row.id === groupId);
						if (group) {
							group.baseMediaId = baseMediaId;
						}
					},
				};
			}

			if (sql.includes("FROM anime_data.groupLineages groupLineages")) {
				return {
					get: () => ({
						groupLineageCount:                   state.groupLineages.length,
						lineagesMissingBaseMediaRecordCount: state.groupLineages.filter((lineage) =>
							lineage.baseMediaId == null || findMedia(
								state,
								lineage.baseMediaId,
							) == null).length,
						lineagesMissingBaseMediaAniListIdCount: state.groupLineages.filter((lineage) => {
							const media = findMedia(
								state,
								lineage.baseMediaId,
							);
							return lineage.baseMediaId == null || media == null || media.idAniList == null;
						}).length,
					}),
				};
			}

			if (sql.includes("FROM anime_data.groups groups")) {
				return {
					get: () => ({
						officialGroupCount:                state.groups.length,
						groupsMissingLineageCount:         state.groups.filter(group =>
							findLineage(
								state,
								group.groupLineageId,
							) == null).length,
						groupsMissingBaseMediaRecordCount: state.groups.filter((group) =>
							group.baseMediaId == null || findMedia(
								state,
								group.baseMediaId,
							) == null).length,
						groupsMissingBaseMediaAniListIdCount: state.groups.filter((group) => {
							const media = findMedia(
								state,
								group.baseMediaId,
							);
							return group.baseMediaId == null || media == null || media.idAniList == null;
						}).length,
						groupsWithBaseMediaMismatchCount:  state.groups.filter((group) => {
							const lineage = findLineage(
								state,
								group.groupLineageId,
							);
							return lineage != null
								&& group.baseMediaId != null
								&& lineage.baseMediaId != null
								&& group.baseMediaId !== lineage.baseMediaId;
						}).length,
					}),
				};
			}

			throw new Error(`Unexpected SQL in repair test mock: ${ sql }`);
		},
	} as unknown as Database;
}

describe(
	"repair-attached-anime-db-group-identities",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"repairs missing lineage rows and mismatched group base media from deterministic group identity",
			async () => {
				const state: FakeAnimeState = {
					media:         [
						{
							mediaId:   101,
							idAniList: 101,
						},
						{
							mediaId:   102,
							idAniList: 102,
						},
					],
					groupLineages: [
						{
							groupLineageId: 102,
							baseMediaId:    102,
						},
					],
					groups:        [
						{
							id:             1,
							groupLineageId: 101,
							baseMediaId:    101,
						},
						{
							id:             2,
							groupLineageId: 102,
							baseMediaId:    101,
						},
					],
				};
				getDatabaseMock.mockReturnValue(createRepairDb(state));

				const { repairAndAssertAttachedAnimeDbReconcileSafety } = await import("./validate-anime-db-reconcile-safety");
				const diagnostics = repairAndAssertAttachedAnimeDbReconcileSafety();

				expect(diagnostics.groupsMissingLineageCount).toBe(0);
				expect(diagnostics.groupsWithBaseMediaMismatchCount).toBe(0);
				expect(state.groupLineages).toContainEqual({
					groupLineageId: 101,
					baseMediaId: 101,
				});
				expect(state.groups.find(group => group.id === 2)?.baseMediaId).toBe(102);
			},
		);

		it(
			"leaves ambiguous base-media collisions blocked for manual review",
			async () => {
				const state: FakeAnimeState = {
					media:         [
						{
							mediaId:   201,
							idAniList: 201,
						},
						{
							mediaId:   202,
							idAniList: 202,
						},
					],
					groupLineages: [
						{
							groupLineageId: 201,
							baseMediaId:    201,
						},
						{
							groupLineageId: 202,
							baseMediaId:    202,
						},
					],
					groups:        [
						{
							id:             1,
							groupLineageId: 201,
							baseMediaId:    202,
						},
						{
							id:             2,
							groupLineageId: 202,
							baseMediaId:    201,
						},
					],
				};
				getDatabaseMock.mockReturnValue(createRepairDb(state));

				const { repairAndAssertAttachedAnimeDbReconcileSafety } = await import("./validate-anime-db-reconcile-safety");

				expect(() => repairAndAssertAttachedAnimeDbReconcileSafety()).toThrow(
					"groupsWithBaseMediaMismatchCount=2",
				);
			},
		);
	},
);
