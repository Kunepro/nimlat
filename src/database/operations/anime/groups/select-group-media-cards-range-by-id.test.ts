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
	"selectGroupMediaCardsRangeById",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"reads a bounded official group media range and maps card payloads",
			async () => {
				const countGet = vi.fn(() => ({ total: 30 }));
				const pageAll  = vi.fn(() => ([
					{
						mediaId:                 501,
						mediaName:               "Bounded Media",
						format:                  "MOVIE",
						mediaDescription: null,
						customImageUrl:          null,
						coverImageJson:          JSON.stringify({ large: "cover-large.jpg" }),
						bannerImage:             "banner.jpg",
						mediaIntegrationPercent: 75,
						mediaIntegrationStatus:  "tracked",
						isWatched: 0,
						isAdult:          0,
						hasPlaybackIssue:        1,
						lastRefreshAt:           2000,
						hasHydrationIssue:       0,
					},
				]));
				const prepare  = vi.fn((statement: string) => {
					if (statement.includes("SELECT COUNT(*) AS total")) {
						expect(statement).toContain("FROM anime_data.groupMedia");
						expect(statement).toContain("COALESCE(userMediaOverrides.nameSearchKey, media.nameSearchKey) LIKE ?");
						expect(statement).toContain("COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')");
						return { get: countGet };
					}
					if (statement.includes("LIMIT ? OFFSET ?")) {
						expect(statement).toContain("FROM anime_data.groupMedia");
						expect(statement).toContain("ORDER BY LOWER");
						expect(statement).toContain("COALESCE(userMediaStates.integrationStatus, '') NOT IN ('ignored', 'not_interested')");
						return { all: pageAll };
					}

					throw new Error(`Unexpected SQL in selectGroupMediaCardsRangeById test: ${ statement }`);
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectGroupMediaCardsRangeById } = await import("./select-group-media-cards-range-by-id");
				const result                             = selectGroupMediaCardsRangeById(
					77,
					40,
					20,
					"bounded",
				);

				expect(countGet).toHaveBeenCalledWith(
					77,
					"bounded",
					"%bounded%",
				);
				expect(pageAll).toHaveBeenCalledWith(
					77,
					"bounded",
					"%bounded%",
					20,
					40,
				);
				expect(result).toEqual({
					offset: 40,
					total:  30,
					items:  [
						{
							mediaId:            501,
							name:               "Bounded Media",
							format:             "MOVIE",
							description:        undefined,
							imageUrl:           "cover-large.jpg",
							integrationPercent: 75,
							integrationStatus:  "tracked",
							isWatched:          false,
							isAdult: false,
							hasPlaybackIssue:   true,
							lastRefresh:        "1970-01-01T00:00:02.000Z",
							hasHydrationIssue:  false,
							isFilm:             true,
						},
					],
				});
			},
		);
	},
);
