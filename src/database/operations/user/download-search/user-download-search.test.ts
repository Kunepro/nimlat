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

function createTransactionalDb(prepare: unknown) {
	return {
		prepare,
		transaction: vi.fn((callback: () => unknown) => () => callback()),
	};
}

describe(
	"user-download-search db operations",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"maps settings rows and sanitizes corrupt selected-preset JSON",
			async () => {
				const prepare = vi.fn((statement: string) => {
					if (statement.includes("FROM userDownloadSearchProviders")) {
						return {
							all: vi.fn(() => [
								{
									id:        "nyaa",
									label:     "Nyaa",
									category:  "torrent",
									baseUrl:   "https://example.test?q={query}",
									isBuiltIn: 0,
									enabled:   1,
									sortOrder: 3,
								},
							]),
						};
					}
					if (statement.includes("FROM userDownloadSearchKeywordPresets")) {
						return {
							all: vi.fn(() => [
								{
									id:        "quality-1080p",
									label:     "1080p",
									value:     "1080p",
									category:  "quality",
									isBuiltIn: 1,
									enabled:   0,
								},
							]),
						};
					}
					if (statement.includes("FROM userDownloadSearchBuilderState")) {
						return {
							get: vi.fn(() => ({
								titleLanguage:         "romaji",
								selectedPresetIdsJson: "[\"quality-1080p\", 10, \"dual-audio\"]",
								customQueryText:       "batch",
							})),
						};
					}
					if (statement.includes("FROM userDownloadSearchQueryPresets")) {
						return {
							all: vi.fn(() => [
								{
									id:                    "broken-json",
									label:                 "Broken",
									selectedPresetIdsJson: "{",
									customQueryText:       "",
									enabled:               1,
									createdAt:             1,
									updatedAt:             2,
								},
							]),
						};
					}
					if (statement.includes("FROM userDownloadBrowserConfig")) {
						return {
							get: vi.fn(() => ({
								mode:           "custom",
								executablePath: "",
							})),
						};
					}

					throw new Error(`Unexpected statement in download-search read test: ${ statement }`);
				});
				getDatabaseMock.mockReturnValue({ prepare });

				const { selectDownloadSearchSettings } = await import("./user-download-search");
				const settings                         = selectDownloadSearchSettings();

				expect(settings.providers).toEqual([
					expect.objectContaining({
						id:        "nyaa",
						isBuiltIn: false,
						enabled:   true,
					}),
				]);
				expect(settings.keywordPresets).toEqual([
					expect.objectContaining({
						id:        "quality-1080p",
						isBuiltIn: true,
						enabled:   false,
					}),
				]);
				expect(settings.builderState.selectedPresetIds).toEqual([
					"quality-1080p",
					"dual-audio",
				]);
				expect(settings.queryPresets[ 0 ]?.selectedPresetIds).toEqual([]);
				expect(settings.browserConfig).toEqual({
					mode: "custom",
				});
			},
		);

		it(
			"deletes a provider and clears last-used media pointers in one transaction",
			async () => {
				const runCalls: unknown[][] = [];
				const prepare               = vi.fn(() => ({
					run: vi.fn((...args: unknown[]) => runCalls.push(args)),
				}));
				const db                    = createTransactionalDb(prepare);
				getDatabaseMock.mockReturnValue(db);
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(1234);

				const { deleteDownloadSearchProvider } = await import("./user-download-search");
				deleteDownloadSearchProvider("nyaa");

				expect(db.transaction).toHaveBeenCalledTimes(1);
				expect(prepare).toHaveBeenCalledWith("DELETE FROM userDownloadSearchProviders WHERE id = ?");
				expect(prepare).toHaveBeenCalledWith("UPDATE userDownloadSearchMediaState SET lastUsedProviderId = NULL, updatedAt = ? WHERE lastUsedProviderId = ?");
				expect(runCalls).toEqual([
					[ "nyaa" ],
					[
						1234,
						"nyaa",
					],
				]);
			},
		);
	},
);
