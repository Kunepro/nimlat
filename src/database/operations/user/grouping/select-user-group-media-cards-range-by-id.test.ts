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

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

describe(
	"selectUserGroupMediaCardsRangeById",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"returns an empty bounded range for a user group with no matching media",
			async () => {
				const countGet = vi.fn(() => ({ total: 0 }));
				const pageAll  = vi.fn(() => ([]));
				const prepare  = vi.fn((statement: string) => {
					if (statement.includes("SELECT COUNT(*) AS total")) {
						expect(statement).toContain("FROM userGroupMedias");
						expect(statement).toContain("COALESCE(userMediaOverrides.nameSearchKey, media.nameSearchKey) LIKE ?");
						expect(statement).toContain("COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')");
						return { get: countGet };
					}
					if (statement.includes("LIMIT ? OFFSET ?")) {
						expect(statement).toContain("FROM userGroupMedias");
						expect(statement).toContain("ORDER BY LOWER");
						expect(statement).toContain("COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')");
						return { all: pageAll };
					}

					throw new Error(`Unexpected SQL in selectUserGroupMediaCardsRangeById test: ${ statement }`);
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectUserGroupMediaCardsRangeById } = await import("./select-user-group-media-cards-range-by-id");
				const result                                 = selectUserGroupMediaCardsRangeById(
					88,
					100,
					25,
					"missing",
				);

				expect(countGet).toHaveBeenCalledWith(
					88,
					"missing",
					"%missing%",
				);
				expect(pageAll).toHaveBeenCalledWith(
					88,
					"missing",
					"%missing%",
					25,
					100,
				);
				expect(result).toEqual({
					offset: 100,
					total:  0,
					items:  [],
				});
			},
		);
	},
);
