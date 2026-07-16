// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

interface QueryRowSet {
	lineageRow: {
		groupLineageCount: number;
		lineagesMissingBaseMediaRecordCount: number;
		lineagesMissingBaseMediaAniListIdCount: number;
	};
	groupRow: {
		officialGroupCount: number;
		groupsMissingLineageCount: number;
		groupsMissingBaseMediaRecordCount: number;
		groupsMissingBaseMediaAniListIdCount: number;
		groupsWithBaseMediaMismatchCount: number;
	};
}

interface MockDatabase {
	close: ReturnType<typeof vi.fn>;
	prepare: ReturnType<typeof vi.fn>;
}

const getDatabaseMock = vi.fn();
const betterSqlite3ConstructorMock = vi.fn();

vi.mock(
	"better-sqlite3",
	() => ({
		default: betterSqlite3ConstructorMock,
	}),
);

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

function createMockDatabase(queryRows: QueryRowSet): MockDatabase {
	return {
		close: vi.fn(),
		prepare: vi.fn((sql: string) => ({
			get: vi.fn(() => {
				if (sql.includes("FROM anime_data.groupLineages groupLineages") || sql.includes("FROM groupLineages groupLineages")) {
					return queryRows.lineageRow;
				}
				if (sql.includes("FROM anime_data.groups groups") || sql.includes("FROM groups groups")) {
					return queryRows.groupRow;
				}

				throw new Error(`Unexpected SQL in test mock: ${ sql }`);
			}),
		})),
	};
}

describe(
	"validate-anime-db-reconcile-safety",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"accepts a healthy attached anime DB",
			async () => {
				getDatabaseMock.mockReturnValue(createMockDatabase({
					lineageRow: {
						groupLineageCount:                   1,
						lineagesMissingBaseMediaRecordCount: 0,
						lineagesMissingBaseMediaAniListIdCount: 0,
					},
					groupRow:   {
						officialGroupCount:                1,
						groupsMissingLineageCount:         0,
						groupsMissingBaseMediaRecordCount: 0,
						groupsMissingBaseMediaAniListIdCount: 0,
						groupsWithBaseMediaMismatchCount:  0,
					},
				}));

				const { assertAttachedAnimeDbReconcileSafety } = await import("./validate-anime-db-reconcile-safety");

				expect(assertAttachedAnimeDbReconcileSafety()).toEqual({
					groupLineageCount:                   1,
					officialGroupCount:                  1,
					lineagesMissingBaseMediaRecordCount: 0,
					lineagesMissingBaseMediaAniListIdCount: 0,
					groupsMissingLineageCount:              0,
					groupsMissingBaseMediaRecordCount:      0,
					groupsMissingBaseMediaAniListIdCount:   0,
					groupsWithBaseMediaMismatchCount:       0,
				});
			},
		);

		it(
			"rejects attached anime DBs whose official groups have no base AniList id",
			async () => {
				getDatabaseMock.mockReturnValue(createMockDatabase({
					lineageRow: {
						groupLineageCount:                   1,
						lineagesMissingBaseMediaRecordCount: 0,
						lineagesMissingBaseMediaAniListIdCount: 0,
					},
					groupRow:   {
						officialGroupCount:                1,
						groupsMissingLineageCount:         0,
						groupsMissingBaseMediaRecordCount: 0,
						groupsMissingBaseMediaAniListIdCount: 1,
						groupsWithBaseMediaMismatchCount:  0,
					},
				}));

				const { assertAttachedAnimeDbReconcileSafety } = await import("./validate-anime-db-reconcile-safety");

				expect(() => assertAttachedAnimeDbReconcileSafety()).toThrow(
					"groupsMissingBaseMediaAniListIdCount=1",
				);
			},
		);

		it(
			"rejects downloaded anime DB files whose groups drift from lineage base-media identity",
			async () => {
				const fileDatabaseMock = createMockDatabase({
					lineageRow: {
						groupLineageCount:                   1,
						lineagesMissingBaseMediaRecordCount: 0,
						lineagesMissingBaseMediaAniListIdCount: 0,
					},
					groupRow:   {
						officialGroupCount:                1,
						groupsMissingLineageCount:         0,
						groupsMissingBaseMediaRecordCount: 0,
						groupsMissingBaseMediaAniListIdCount: 0,
						groupsWithBaseMediaMismatchCount:  1,
					},
				});
				betterSqlite3ConstructorMock.mockReturnValue(fileDatabaseMock);

				const { assertAnimeDbFileReconcileSafety } = await import("./validate-anime-db-reconcile-safety");

				expect(() => assertAnimeDbFileReconcileSafety("C:\\fake\\anime_data.db")).toThrow(
					"groupsWithBaseMediaMismatchCount=1",
				);
				expect(fileDatabaseMock.close).toHaveBeenCalledTimes(1);
				expect(betterSqlite3ConstructorMock).toHaveBeenCalledWith(
					"C:\\fake\\anime_data.db",
					{
						readonly:      true,
						fileMustExist: true,
					},
				);
			},
		);
	},
);
