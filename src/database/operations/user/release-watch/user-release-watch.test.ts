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
	"user release-watch reads",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"limits tracked pages to current interest rows",
			async () => {
				const rowAll               = vi.fn(() => [
					{
						mediaId:              101,
						watchDomain:          "past",
						state:                "released_needs_integration",
						resolvedReleaseAt:    1_772_848_000_000,
						releaseDatePrecision: "timestamp",
						releaseDateSource:    "provider_release_at",
						integrationStatus:    "tracked",
						integrationPercent:   25,
						payloadJson:          "{\"kind\":\"fixture\"}",
						updatedAt:            1_772_850_000_000,
						name:                 "Scoped Show",
						format:               "TV",
					},
				]);
				const countGet             = vi.fn(() => ({ total: 1 }));
				const statements: string[] = [];
				const prepare              = vi.fn((statement: string) => {
					statements.push(statement);

					if (statement.includes("SELECT COUNT(*) AS total")) {
						return { get: countGet };
					}

					return { all: rowAll };
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectPastReleaseWatchPage } = await import("./user-release-watch");
				const page                           = selectPastReleaseWatchPage(
					"tracked",
					0,
					50,
				);

				expect(statements).toHaveLength(2);
				statements.forEach((statement) => {
					expect(statement).toContain("FROM userReleaseWatchInterestMedia interest");
					expect(statement).toContain("interest.mediaId = releaseWatch.mediaId");
					expect(statement).not.toContain("sourceInterest");
				});
				expect(rowAll).toHaveBeenCalledWith(
					"past",
					50,
					0,
				);
				expect(countGet).toHaveBeenCalledWith("past");
				expect(page).toEqual({
					items:      [
						expect.objectContaining({
							mediaId:           101,
							name:              "Scoped Show",
							integrationStatus: "tracked",
							payload:           { kind: "fixture" },
						}),
					],
					nextOffset: null,
					total:      1,
				});
			},
		);

		it(
			"keeps all-catalog pages independent from the materialized tracked-interest scope",
			async () => {
				const rowAll               = vi.fn(() => []);
				const countGet             = vi.fn(() => ({ total: 0 }));
				const statements: string[] = [];
				const prepare              = vi.fn((statement: string) => {
					statements.push(statement);

					if (statement.includes("SELECT COUNT(*) AS total")) {
						return { get: countGet };
					}

					return { all: rowAll };
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectUpcomingReleaseWatchPage } = await import("./user-release-watch");
				const page                               = selectUpcomingReleaseWatchPage(
					"all",
					10,
					25,
				);

				expect(statements).toHaveLength(2);
				statements.forEach((statement) => {
					expect(statement).not.toContain("userReleaseWatchInterestMedia");
				});
				expect(page).toEqual({
					items:      [],
					nextOffset: null,
					total:      0,
				});
			},
		);
	},
);
