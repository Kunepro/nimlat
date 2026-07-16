// @vitest-environment node
import { BUILT_IN_DOWNLOAD_SEARCH_PROVIDERS } from "@nimlat/constants/download-search-defaults";
import type { Database } from "better-sqlite3";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { initUserDownloadSearchSchema } from "./user-db-download-search-schema";

describe(
	"user-db-download-search-schema",
	() => {
		it(
			"uses an explicit query placeholder in every built-in provider example",
			() => {
				expect(BUILT_IN_DOWNLOAD_SEARCH_PROVIDERS.every(
					(provider) => provider.baseUrl.includes("{query}"),
				)).toBe(true);
			},
		);

		it(
			"only reconciles provider rows that still match the legacy URL",
			() => {
				const updateRun = vi.fn();
				const prepare   = vi.fn((statement: string) => {
					if (statement.includes("SELECT settingValue FROM config")) {
						return {
							get: vi.fn(() => ({ settingValue: "true" })),
						};
					}
					if (statement.includes("UPDATE userDownloadSearchProviders")) {
						expect(statement).toContain("WHERE id = ?");
						expect(statement).toContain("AND baseUrl = ?");
						return { run: updateRun };
					}
					throw new Error(`Unexpected prepared statement: ${ statement }`);
				});
				const db        = {
					exec: vi.fn(),
					prepare,
				} as unknown as Database;

				initUserDownloadSearchSchema(db);

				expect(updateRun.mock.calls).toEqual([
					[
						"https://nyaa.si/?f=0&c=0_0&q={query}",
						expect.any(Number),
						"nyaa",
						"https://nyaa.si/?f=0&c=0_0&q=",
					],
					[
						"https://www.tokyotosho.info/search.php?terms={query}",
						expect.any(Number),
						"tokyo-toshokan",
						"https://www.tokyotosho.info/search.php?terms=",
					],
					[
						"https://anidex.moe/?q={query}",
						expect.any(Number),
						"anidex",
						"https://anidex.moe/?q=",
					],
					[
						"https://thepiratebay.org/search.php?q={query}",
						expect.any(Number),
						"the-pirate-bay",
						"https://thepiratebay.org/search.php?q=",
					],
				]);
			},
		);
	},
);
