// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const { resolveOrSeedCanonicalMediaIdByAniListIdMock } = vi.hoisted(() => ({
	resolveOrSeedCanonicalMediaIdByAniListIdMock: vi.fn(),
}));

vi.mock(
	"../../canonical/canonical-id-resolution",
	() => ({
		resolveOrSeedCanonicalMediaIdByAniListId: resolveOrSeedCanonicalMediaIdByAniListIdMock,
	}),
);

describe(
	"_upsertMediaRelations",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"persists only supported animated related-media stubs",
			async () => {
				const ensureRelatedMediaExistsRun = vi.fn();
				const insertMediaRelationRun      = vi.fn();
				const database                    = {
					prepare: vi.fn((sql: string) => {
						if (sql.includes("INSERT INTO anime_data.media (mediaId")) {
							return { run: ensureRelatedMediaExistsRun };
						}
						if (sql.includes("INSERT OR IGNORE INTO anime_data.mediaRelations")) {
							return { run: insertMediaRelationRun };
						}

						throw new Error(`Unexpected SQL in _upsertMediaRelations test: ${ sql }`);
					}),
				};

				resolveOrSeedCanonicalMediaIdByAniListIdMock.mockImplementation(
					(_db: unknown, aniListId: number) => aniListId + 1000,
				);

				const { _upsertMediaRelations } = await import("./_upsert-media-relations");
				_upsertMediaRelations(
					database as never,
					{
						id:        1,
						relations: {
							edges: [
								{
									relationType: "SEQUEL",
									node:         {
										id:          10,
										idMal:       20,
										title:       { english: "Allowed sequel" },
										format:      "TV",
										status:      "FINISHED",
										description: "allowed",
										episodes:    12,
										coverImage:  null,
										isAdult:     false,
									},
								},
								{
									relationType: "SOURCE",
									node:         {
										id:          11,
										idMal:       21,
										title:       { english: "Unsupported manga" },
										format:      "MANGA" as never,
										status:      "FINISHED",
										description: "ignored",
										episodes:    null,
										coverImage:  null,
										isAdult:     false,
									},
								},
							],
						},
					} as never,
				);

				expect(resolveOrSeedCanonicalMediaIdByAniListIdMock).toHaveBeenCalledTimes(2);
				expect(resolveOrSeedCanonicalMediaIdByAniListIdMock).toHaveBeenNthCalledWith(
					1,
					database,
					1,
				);
				expect(resolveOrSeedCanonicalMediaIdByAniListIdMock).toHaveBeenNthCalledWith(
					2,
					database,
					10,
				);
				expect(ensureRelatedMediaExistsRun).toHaveBeenCalledOnce();
				expect(insertMediaRelationRun).toHaveBeenCalledWith(
					1001,
					1010,
					"SEQUEL",
				);
			},
		);
	},
);
