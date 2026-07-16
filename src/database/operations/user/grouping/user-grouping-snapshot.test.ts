// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const {
				ensureCanonicalGroupLineageByBaseMediaIdMock,
				getDatabaseMock,
			} = vi.hoisted(() => ({
	ensureCanonicalGroupLineageByBaseMediaIdMock: vi.fn(),
	getDatabaseMock:                              vi.fn(),
}));

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

vi.mock(
	"../../anime/canonical/canonical-id-resolution",
	() => ({
		ensureCanonicalGroupLineageByBaseMediaId: ensureCanonicalGroupLineageByBaseMediaIdMock,
	}),
);

describe(
	"user-grouping-snapshot",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"creates user groups with the supplied internal base media id",
			async () => {
				const insertRun = vi.fn(() => ({
					lastInsertRowid: 91,
				}));
				const database  = {
					prepare:     vi.fn((sql: string) => {
						// noinspection SqlResolve
						if (sql.includes("INSERT INTO userGroups")) {
							return {
								run: insertRun,
							};
						}

						throw new Error(`Unexpected SQL in createUserGroup test: ${ sql }`);
					}),
					transaction: vi.fn((callback: () => void) => () => callback()),
				};
				getDatabaseMock.mockReturnValue(database);
				ensureCanonicalGroupLineageByBaseMediaIdMock.mockReturnValue(501);

				const { createUserGroup } = await import("./user-grouping-snapshot");
				const createdGroupId      = createUserGroup({
					baseMediaId:   3401,
					name:          "Custom Group",
					description:   "desc",
					imageUrl:      "img",
					isUserCreated: 1,
					createdAt:     10,
					updatedAt:     11,
				});

				expect(createdGroupId).toBe(91);
				expect(ensureCanonicalGroupLineageByBaseMediaIdMock).toHaveBeenCalledWith(
					database,
					3401,
				);
				expect(insertRun).toHaveBeenCalledWith(
					501,
					3401,
					"Custom Group",
					"customgroup",
					"desc",
					"img",
					1,
					10,
					11,
				);
			},
		);

		it(
			"assigns medias to user groups using the provided internal media ids without provider remapping",
			async () => {
				const insertRun = vi.fn();
				const database  = {
					prepare:     vi.fn((sql: string) => {
						// noinspection SqlResolve
						if (sql.includes("INSERT OR IGNORE INTO userGroupMedias")) {
							return {
								run: insertRun,
							};
						}

						throw new Error(`Unexpected SQL in assignMediasToUserGroup test: ${ sql }`);
					}),
					transaction: vi.fn(
						(callback: (rows: Array<{ groupId: number; mediaId: number }>) => void) => (rows: Array<{
							groupId: number;
							mediaId: number;
						}>) => callback(rows),
					),
				};
				getDatabaseMock.mockReturnValue(database);

				const { assignMediasToUserGroup } = await import("./user-grouping-snapshot");
				assignMediasToUserGroup(
					12,
					[
						4401,
						4402,
					],
				);

				expect(insertRun).toHaveBeenCalledTimes(2);
				expect(insertRun).toHaveBeenNthCalledWith(
					1,
					12,
					4401,
				);
				expect(insertRun).toHaveBeenNthCalledWith(
					2,
					12,
					4402,
				);
			},
		);

		it(
			"persists lineage mappings from the supplied internal base media id when no canonical row exists yet",
			async () => {
				const selectGet = vi.fn(() => undefined);
				const insertRun = vi.fn();
				const database  = {
					prepare:     vi.fn((sql: string) => {
						if (sql.includes("SELECT groupLineageId")) {
							return {
								get: selectGet,
							};
						}
						// noinspection SqlResolve
						if (sql.includes("INSERT INTO userGroupLineages")) {
							return {
								run: insertRun,
							};
						}

						throw new Error(`Unexpected SQL in saveUserGroupLineage test: ${ sql }`);
					}),
					transaction: vi.fn((callback: () => void) => () => callback()),
				};
				getDatabaseMock.mockReturnValue(database);
				ensureCanonicalGroupLineageByBaseMediaIdMock.mockReturnValue(777);

				const { saveUserGroupLineage } = await import("./user-grouping-snapshot");
				saveUserGroupLineage({
					animeBaseMediaId:        8801,
					userGroupId:             18,
					status:                  "active",
					firstSeenAnimeDbVersion: "v1",
					lastSeenAnimeDbVersion:  "v2",
					lastAutoImportedAt:      30,
					lastUserModifiedAt:      31,
				});

				expect(ensureCanonicalGroupLineageByBaseMediaIdMock).toHaveBeenCalledWith(
					database,
					8801,
				);
				expect(database.prepare).toHaveBeenCalledWith(expect.stringContaining("WHERE baseMediaId = ?"));
				expect(insertRun).toHaveBeenCalledWith(
					777,
					18,
					"active",
					"v1",
					"v2",
					30,
					31,
				);
			},
		);
	},
);
