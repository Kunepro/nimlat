// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const {
				getAnimeDbVersionMock,
				getStartupReadinessFactsMock,
			} = vi.hoisted(() => ({
	getAnimeDbVersionMock:        vi.fn(),
	getStartupReadinessFactsMock: vi.fn(),
}));

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			metadata: {
				getStartupReadinessFacts: getStartupReadinessFactsMock,
			},
		},
		UserDbFacade:  {
			config: {
				getAnimeDbVersion: getAnimeDbVersionMock,
			},
		},
	}),
);

describe(
	"anime-db-startup-readiness-service",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			getAnimeDbVersionMock.mockReturnValue("v2026.01");
		});

		it(
			"marks the AnimeDB ready from catalog content even when no config version is stored",
			async () => {
				getAnimeDbVersionMock.mockReturnValue(null);
				getStartupReadinessFactsMock.mockReturnValue({
					hasRequiredSchema: true,
					hasCatalogMedia:  true,
					hasCatalogGroups: true,
					missingTables:    [],
				});

				const { getAnimeDbStartupReadiness } = await import("./anime-db-startup-readiness-service");

				expect(getAnimeDbStartupReadiness()).toEqual({
					status:                 "ready",
					canUseLocalCatalog:     true,
					shouldDownloadBaseline: false,
					animeDbVersion:         null,
					message:                "AnimeDB is ready.",
				});
			},
		);

		it(
			"requires a baseline download when config has a version but the catalog is empty",
			async () => {
				getStartupReadinessFactsMock.mockReturnValue({
					hasRequiredSchema: true,
					hasCatalogMedia:  false,
					hasCatalogGroups: false,
					missingTables:    [],
				});

				const { getAnimeDbStartupReadiness } = await import("./anime-db-startup-readiness-service");

				expect(getAnimeDbStartupReadiness()).toEqual({
					status:                 "empty",
					canUseLocalCatalog:     false,
					shouldDownloadBaseline: true,
					animeDbVersion:         "v2026.01",
					message:                "AnimeDB baseline content is missing.",
				});
			},
		);

		it(
			"requires a baseline download when required AnimeDB tables are missing",
			async () => {
				getStartupReadinessFactsMock.mockReturnValue({
					hasRequiredSchema: false,
					hasCatalogMedia:  false,
					hasCatalogGroups: false,
					missingTables:    [
						"media",
						"groups",
					],
				});

				const { getAnimeDbStartupReadiness } = await import("./anime-db-startup-readiness-service");

				expect(getAnimeDbStartupReadiness()).toMatchObject({
					status:                 "missing_schema",
					canUseLocalCatalog:     false,
					shouldDownloadBaseline: true,
					animeDbVersion:         "v2026.01",
				});
			},
		);

		it(
			"returns a stable unavailable status if readiness facts cannot be read",
			async () => {
				getStartupReadinessFactsMock.mockImplementation(() => {
					throw new Error("db unavailable");
				});

				const { getAnimeDbStartupReadiness } = await import("./anime-db-startup-readiness-service");

				expect(getAnimeDbStartupReadiness()).toEqual({
					status:                 "unavailable",
					canUseLocalCatalog:     false,
					shouldDownloadBaseline: true,
					animeDbVersion:         "v2026.01",
					message:                "db unavailable",
				});
			},
		);
	},
);
