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
	"selectLibraryDisplayItemsPage",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"gates official-group rows behind anime mode and still maps user-group rows correctly",
			async () => {
				const countGet = vi.fn(() => ({ total: 1 }));
				const pageAll  = vi.fn(() => ([
					{
						itemKind:           "group",
						itemSource:         "user",
						groupId:            10,
						mediaId:            null,
						name:               "Alpha Group",
						description:        null,
						imageUrl:           "group.jpg",
						format:             null,
						coverImageJson:     null,
						bannerImage:        null,
						integrationPercent: 55,
						integrationStatus:  "tracked",
						mediasCount:        3,
						lastRefreshAt:      1000,
					},
				]));
				const prepare  = vi.fn((statement: string) => {
					if (statement.includes("SELECT ((SELECT COUNT(*) FROM visibleOfficialGroups)")) {
						expect(statement).toContain("groupingMode.groupingMode <> 'user'");
						expect(statement).toContain("currentAdultContent");
						expect(statement).toContain("COALESCE(adultMedia.isAdult, 0) = 1");
						return { get: countGet };
					}
					if (statement.includes("FROM (SELECT *")) {
						expect(statement).toContain("groupingMode.groupingMode <> 'user'");
						expect(statement).toContain("currentAdultContent");
						expect(statement).toContain("COALESCE(adultMedia.isAdult, 0) = 1");
						expect(statement).toContain("COALESCE(officialGroupMediaStates.integrationStatus, '') IN ('ignored', 'not_interested')");
						expect(statement).toContain("COALESCE(userGroupMediaStates.integrationStatus, '') IN ('ignored', 'not_interested')");
						return { all: pageAll };
					}

					throw new Error(`Unexpected SQL in selectLibraryDisplayItemsPage test: ${ statement }`);
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectLibraryDisplayItemsPage } = await import("./select-library-display-items-page");
				const result = selectLibraryDisplayItemsPage(
					0,
					20,
					"",
					"library",
				);

				expect(countGet).toHaveBeenCalledWith(
					"library",
					"mixed",
					"groups",
					"[]",
					"[]",
					"",
					"%%",
					"",
					"%%",
					"",
					"%%",
				);
				expect(pageAll).toHaveBeenCalledWith(
					"library",
					"mixed",
					"groups",
					"[]",
					"[]",
					"",
					"%%",
					"",
					"%%",
					"",
					"%%",
					20,
					0,
				);
				expect(result).toEqual({
					items:      [
						{
							key:                "group:user:10",
							kind:               "group",
							name:               "Alpha Group",
							description:        undefined,
							imageUrl:           "group.jpg",
							format:             undefined,
							isAdult: false,
							isWatched:          false,
							integrationPercent: 55,
							integrationStatus:  "tracked",
							lastRefresh:        "1970-01-01T00:00:01.000Z",
							group:              {
								source:  "user",
								groupId: 10,
							},
							mediasCount:        3,
						},
					],
					nextOffset: null,
					total:      1,
				});
			},
		);

		it(
			"stops official memberships from blocking orphan media while grouping mode is user",
			async () => {
				const countGet = vi.fn(() => ({ total: 1 }));
				const pageAll  = vi.fn(() => ([
					{
						itemKind:           "media",
						itemSource:         null,
						groupId:            null,
						mediaId:            202,
						name:               "Orphan Candidate",
						description:        null,
						imageUrl:           null,
						format:             "TV",
						coverImageJson:     null,
						bannerImage:        "banner.jpg",
						integrationPercent: null,
						integrationStatus:  null,
						mediasCount:        null,
						lastRefreshAt:      2000,
					},
				]));
				const prepare  = vi.fn((statement: string) => {
					if (statement.includes("SELECT ((SELECT COUNT(*) FROM visibleOfficialGroups)")) {
						expect(statement).toContain("groupingMode.groupingMode = 'user'");
						expect(statement).toContain("adultFilter.adultFilter = 'nonAdult'");
						return { get: countGet };
					}
					if (statement.includes("FROM (SELECT *")) {
						expect(statement).toContain("groupingMode.groupingMode = 'user'");
						expect(statement).toContain("adultFilter.adultFilter = 'nonAdult'");
						return { all: pageAll };
					}

					throw new Error(`Unexpected SQL in selectLibraryDisplayItemsPage test: ${ statement }`);
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectLibraryDisplayItemsPage } = await import("./select-library-display-items-page");
				const result = selectLibraryDisplayItemsPage(
					0,
					20,
					"",
					"library",
				);

				expect(result.items).toEqual([
					{
						key:                "media:202",
						kind:               "media",
						name:               "Orphan Candidate",
						description:        undefined,
						imageUrl:           "banner.jpg",
						format:             "TV",
						isAdult: false,
						isFilm:             false,
						isWatched:          false,
						integrationPercent: undefined,
						integrationStatus:  undefined,
						lastRefresh:        "1970-01-01T00:00:02.000Z",
						mediaId:            202,
					},
				]);
				expect(result.total).toBe(1);
			},
		);

		it(
			"switches to ignored-only scope and keeps completion-first ordering in SQL",
			async () => {
				const countGet = vi.fn(() => ({ total: 0 }));
				const pageAll  = vi.fn(() => ([]));
				const prepare  = vi.fn((statement: string) => {
					if (statement.includes("SELECT ((SELECT COUNT(*) FROM visibleOfficialGroups)")) {
						expect(statement).toContain("scopeFilter.scope = 'ignored'");
						expect(statement.match(/LEFT JOIN userAnimeGroupStates/g)).toHaveLength(1);
						expect(statement).toContain("COALESCE(userMediaStates.integrationStatus, '') IN ('ignored', 'not_interested')");
						return { get: countGet };
					}
					if (statement.includes("FROM (SELECT *")) {
						expect(statement).toContain("scopeFilter.scope = 'ignored'");
						expect(statement.match(/LEFT JOIN userAnimeGroupStates/g)).toHaveLength(1);
						expect(statement).toContain("COALESCE(integrationStatus, '') IN ('tracked', 'downloading', 'downloaded', 'integrated')");
						expect(statement).toContain("COALESCE(integrationStatus, '') IN ('ignored', 'not_interested')");
						return { all: pageAll };
					}

					throw new Error(`Unexpected SQL in selectLibraryDisplayItemsPage test: ${ statement }`);
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectLibraryDisplayItemsPage } = await import("./select-library-display-items-page");
				selectLibraryDisplayItemsPage(
					0,
					20,
					"",
					"ignored",
				);

				expect(countGet).toHaveBeenCalledWith(
					"ignored",
					"mixed",
					"groups",
					"[]",
					"[]",
					"",
					"%%",
					"",
					"%%",
					"",
					"%%",
				);
				expect(pageAll).toHaveBeenCalledWith(
					"ignored",
					"mixed",
					"groups",
					"[]",
					"[]",
					"",
					"%%",
					"",
					"%%",
					"",
					"%%",
					20,
					0,
				);
			},
		);

		it(
			"passes adult and raw-media filters into the bounded SQL reads",
			async () => {
				const countGet = vi.fn(() => ({ total: 0 }));
				const pageAll  = vi.fn(() => ([]));
				const prepare  = vi.fn((statement: string) => {
					expect(statement).toContain("currentAdultFilter");
					expect(statement).toContain("currentDisplayMode");
					expect(statement).toContain("currentGenreFilters");
					expect(statement).toContain("currentTagFilters");
					expect(statement).toContain("currentMetadataFilters");
					expect(statement).toContain("requiredGenre");
					expect(statement).toContain("requiredTag");
					expect(statement).toContain("adultFilter.adultFilter = 'adult'");
					expect(statement).toContain("displayMode.displayMode = 'groups'");
					expect(statement).toContain("displayMode.displayMode = 'rawMedia'");

					if (statement.includes("SELECT ((SELECT COUNT(*) FROM visibleOfficialGroups)")) {
						return { get: countGet };
					}
					if (statement.includes("FROM (SELECT *")) {
						return { all: pageAll };
					}

					throw new Error(`Unexpected SQL in selectLibraryDisplayItemsPage test: ${ statement }`);
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectLibraryDisplayItemsPage } = await import("./select-library-display-items-page");
				selectLibraryDisplayItemsPage(
					40,
					20,
					"Pókè-mon!",
					"library",
					{
						adultFilter: "adult",
						displayMode: "rawMedia",
						genreNames:  [
							"Action",
							"Action",
							"Fantasy",
						],
						tagNames:    [ "Found Family" ],
					},
				);

				expect(countGet).toHaveBeenCalledWith(
					"library",
					"adult",
					"rawMedia",
					"[\"Action\",\"Fantasy\"]",
					"[\"Found Family\"]",
					"pokemon",
					"%pokemon%",
					"pokemon",
					"%pokemon%",
					"pokemon",
					"%pokemon%",
				);
				expect(pageAll).toHaveBeenCalledWith(
					"library",
					"adult",
					"rawMedia",
					"[\"Action\",\"Fantasy\"]",
					"[\"Found Family\"]",
					"pokemon",
					"%pokemon%",
					"pokemon",
					"%pokemon%",
					"pokemon",
					"%pokemon%",
					20,
					40,
				);
			},
		);
	},
);
