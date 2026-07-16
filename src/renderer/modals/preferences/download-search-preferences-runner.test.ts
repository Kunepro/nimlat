// @vitest-environment jsdom

import type { DownloadSearchProvider } from "@nimlat/types/download-search";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { DownloadSearchFacade } from "../../facades";
import {
	createDownloadProviderPreference,
	deleteDownloadProviderPreference,
	loadDownloadSearchPreferencesSettings,
	pickDownloadBrowserExecutablePath,
	saveDownloadBrowserConfigDraft,
	setDownloadProviderEnabledPreference,
	updateDownloadProviderPreference,
} from "./download-search-preferences-runner";

function createProvider(): DownloadSearchProvider {
	return {
		id:        "provider-1",
		label:     "Nyaa",
		category:  "torrent",
		baseUrl:   "https://nyaa.example/search?q={query}",
		isBuiltIn: false,
		enabled:   true,
		sortOrder: 1,
	};
}

describe(
	"download-search-preferences-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists browser config drafts through the download search facade",
			async () => {
				vi.spyOn(
					DownloadSearchFacade,
					"saveBrowserConfig",
				).mockResolvedValue();

				await expect(saveDownloadBrowserConfigDraft(
					"custom",
					"/Applications/Browser.app",
				)).resolves.toEqual({
					mode:           "custom",
					executablePath: "/Applications/Browser.app",
				});
				await expect(saveDownloadBrowserConfigDraft(
					"system",
					"/Applications/Browser.app",
				)).resolves.toEqual({ mode: "system" });

				expect(DownloadSearchFacade.saveBrowserConfig).toHaveBeenCalledWith({
					mode:           "custom",
					executablePath: "/Applications/Browser.app",
				});
				expect(DownloadSearchFacade.saveBrowserConfig).toHaveBeenCalledWith({ mode: "system" });
			},
		);

		it(
			"loads download search settings through the download search facade",
			async () => {
				vi.spyOn(
					DownloadSearchFacade,
					"getSettings",
				).mockResolvedValue({
					providers:      [],
					keywordPresets: [],
					queryPresets:   [],
					builderState:   {
						titleLanguage:     "english",
						selectedPresetIds: [],
						customQueryText:   "",
					},
					browserConfig:  { mode: "system" },
				});

				await expect(loadDownloadSearchPreferencesSettings()).resolves.toEqual({
					providers:      [],
					keywordPresets: [],
					queryPresets:   [],
					builderState:   {
						titleLanguage:     "english",
						selectedPresetIds: [],
						customQueryText:   "",
					},
					browserConfig:  { mode: "system" },
				});

				expect(DownloadSearchFacade.getSettings).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"normalizes browser executable picker results for Preferences state",
			async () => {
				vi.spyOn(
					DownloadSearchFacade,
					"pickBrowserExecutable",
				)
					.mockResolvedValueOnce({
						success:        true,
						executablePath: "/Applications/Browser.app",
					})
					.mockResolvedValueOnce({
						success:  true,
						canceled: true,
					})
					.mockResolvedValueOnce({ success: false });

				await expect(pickDownloadBrowserExecutablePath()).resolves.toBe("/Applications/Browser.app");
				await expect(pickDownloadBrowserExecutablePath()).resolves.toBeNull();
				await expect(pickDownloadBrowserExecutablePath()).resolves.toBeNull();

				expect(DownloadSearchFacade.pickBrowserExecutable).toHaveBeenCalledTimes(3);
			},
		);

		it(
			"persists provider mutations through the download search facade",
			async () => {
				const provider = createProvider();
				vi.spyOn(
					DownloadSearchFacade,
					"setProviderEnabled",
				).mockResolvedValue();
				vi.spyOn(
					DownloadSearchFacade,
					"createProvider",
				).mockResolvedValue(provider);
				vi.spyOn(
					DownloadSearchFacade,
					"updateProvider",
				).mockResolvedValue({
					...provider,
					label: "Nyaa.si",
				});
				vi.spyOn(
					DownloadSearchFacade,
					"deleteProvider",
				).mockResolvedValue();

				await expect(setDownloadProviderEnabledPreference(
					"provider-1",
					false,
				)).resolves.toBeUndefined();
				await expect(createDownloadProviderPreference({
					label:    "Nyaa",
					category: "torrent",
					baseUrl:  "https://nyaa.example/search?q={query}",
				})).resolves.toEqual(provider);
				await expect(updateDownloadProviderPreference(
					"provider-1",
					{
						label:    "Nyaa.si",
						category: "torrent",
						baseUrl:  "https://nyaa.si/?q={query}",
					},
				)).resolves.toEqual({
					...provider,
					label: "Nyaa.si",
				});
				await expect(deleteDownloadProviderPreference("provider-1")).resolves.toBeUndefined();

				expect(DownloadSearchFacade.setProviderEnabled).toHaveBeenCalledWith(
					"provider-1",
					false,
				);
				expect(DownloadSearchFacade.createProvider).toHaveBeenCalledWith({
					label:    "Nyaa",
					category: "torrent",
					baseUrl:  "https://nyaa.example/search?q={query}",
				});
				expect(DownloadSearchFacade.updateProvider).toHaveBeenCalledWith({
					providerId: "provider-1",
					label:      "Nyaa.si",
					category:   "torrent",
					baseUrl:    "https://nyaa.si/?q={query}",
				});
				expect(DownloadSearchFacade.deleteProvider).toHaveBeenCalledWith("provider-1");
			},
		);
	},
);
