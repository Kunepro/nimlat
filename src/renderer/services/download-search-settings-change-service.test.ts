// @vitest-environment node
import type {
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

function installDownloadSearchApiMock() {
	const provider: DownloadSearchProvider           = {
		id:        "nyaa",
		label:     "Nyaa",
		category:  "torrent",
		baseUrl:   "https://example.test/search?q={query}",
		isBuiltIn: false,
		enabled:   true,
		sortOrder: 1,
	};
	const keywordPreset: DownloadSearchKeywordPreset = {
		id:        "quality-1080p",
		label:     "1080p",
		value:     "1080p",
		category:  "quality",
		isBuiltIn: false,
		enabled:   true,
	};
	const queryPreset: DownloadSearchQueryPreset     = {
		id:                "season-pack",
		label:             "Season Pack",
		selectedPresetIds: [ "quality-1080p" ],
		customQueryText:   "batch",
		enabled:           true,
		createdAt:         1,
		updatedAt:         1,
	};
	const downloadSearch                             = {
		saveBrowserConfig:     vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		setProviderEnabled:    vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		createProvider:        vi.fn<() => Promise<DownloadSearchProvider>>().mockResolvedValue(provider),
		updateProvider:        vi.fn<() => Promise<DownloadSearchProvider>>().mockResolvedValue(provider),
		deleteProvider:        vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		createKeywordPreset:   vi.fn<() => Promise<DownloadSearchKeywordPreset>>().mockResolvedValue(keywordPreset),
		createQueryPreset:     vi.fn<() => Promise<DownloadSearchQueryPreset>>().mockResolvedValue(queryPreset),
		setQueryPresetEnabled: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		deleteQueryPreset:     vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
	};
	vi.stubGlobal(
		"window",
		{
			electronAPI: {
				downloadSearch,
			},
		},
	);

	return {
		downloadSearch,
		keywordPreset,
		provider,
		queryPreset,
	};
}

describe(
	"DownloadSearchSettingsChangeService",
	() => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"publishes one settings-changed event after each successful settings write",
			async () => {
				installDownloadSearchApiMock();
				const { DownloadSearchSettingsChangeService } = await import("./download-search-settings-change-service");
				const settingsChangedListener                 = vi.fn();
				const subscription                            = DownloadSearchSettingsChangeService.settingsChanges().subscribe(settingsChangedListener);

				await DownloadSearchSettingsChangeService.saveBrowserConfig({ mode: "system" });
				await DownloadSearchSettingsChangeService.setProviderEnabled(
					"nyaa",
					false,
				);
				await DownloadSearchSettingsChangeService.deleteProvider("nyaa");
				await DownloadSearchSettingsChangeService.setQueryPresetEnabled(
					"season-pack",
					false,
				);
				await DownloadSearchSettingsChangeService.deleteQueryPreset("season-pack");

				expect(settingsChangedListener).toHaveBeenCalledTimes(5);

				subscription.unsubscribe();
				await DownloadSearchSettingsChangeService.deleteQueryPreset("season-pack");

				expect(settingsChangedListener).toHaveBeenCalledTimes(5);
			},
		);

		it(
			"preserves created and updated records while notifying consumers",
			async () => {
				const {
								keywordPreset,
								provider,
								queryPreset,
							}                                       = installDownloadSearchApiMock();
				const { DownloadSearchSettingsChangeService } = await import("./download-search-settings-change-service");
				const settingsChangedListener                 = vi.fn();
				DownloadSearchSettingsChangeService.settingsChanges().subscribe(settingsChangedListener);

				await expect(DownloadSearchSettingsChangeService.createProvider({
					label:    "Nyaa",
					category: "torrent",
					baseUrl:  "https://example.test/search?q={query}",
				})).resolves.toBe(provider);
				await expect(DownloadSearchSettingsChangeService.updateProvider({
					providerId: "nyaa",
					label:      "Nyaa",
					category:   "torrent",
					baseUrl:    "https://example.test/search?q={query}",
				})).resolves.toBe(provider);
				await expect(DownloadSearchSettingsChangeService.createKeywordPreset({
					label:    "1080p",
					value:    "1080p",
					category: "quality",
				})).resolves.toBe(keywordPreset);
				await expect(DownloadSearchSettingsChangeService.createQueryPreset({
					label:             "Season Pack",
					selectedPresetIds: [ "quality-1080p" ],
					customQueryText:   "batch",
				})).resolves.toBe(queryPreset);

				expect(settingsChangedListener).toHaveBeenCalledTimes(4);
			},
		);

		it(
			"does not notify consumers when a settings write fails",
			async () => {
				const {
								downloadSearch,
							}             = installDownloadSearchApiMock();
				const expectedError = new Error("persist failed");
				downloadSearch.deleteProvider.mockRejectedValueOnce(expectedError);
				const { DownloadSearchSettingsChangeService } = await import("./download-search-settings-change-service");
				const settingsChangedListener                 = vi.fn();
				DownloadSearchSettingsChangeService.settingsChanges().subscribe(settingsChangedListener);

				await expect(DownloadSearchSettingsChangeService.deleteProvider("nyaa")).rejects.toBe(expectedError);

				expect(settingsChangedListener).not.toHaveBeenCalled();
			},
		);
	},
);
