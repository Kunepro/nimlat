// @vitest-environment node

import type { DownloadSearchSettings } from "@nimlat/types/download-search";
import {
	describe,
	expect,
	it,
} from "vitest";
import type { PreferencesModalState } from "../../types/modals";
import {
	applyLoadedCanvasDiagnosticsStatus,
	applyLoadedDevModeStatus,
	applyLoadedDownloadSearchSettings,
	applyLoadedPreferredTitleLanguage,
	recoverFailedDevModeLoad,
	revertOptimisticPreferenceIfCurrent,
	setOptimisticPreference,
} from "./preferences-settings-model";

function createPreferencesState(): PreferencesModalState {
	return {
		isOpen:                     true,
		isAdultContentEnabled:      false,
		backgroundStyle:            "kanaMatrix",
		preferredTitleLanguage:     "english",
		isDevModeEnabled:           true,
		isCanvasDiagnosticsEnabled: false,
		downloadBrowserConfig:      { mode: "system" },
		downloadBrowserDraft:       { mode: "system" },
		downloadBrowserCustomPath:  "/previous/browser",
		downloadProviders:          [],
		isAddingDownloadProvider:   false,
		editingDownloadProviderId:  null,
		newDownloadProvider:        {
			label:    "",
			category: "torrent",
			baseUrl:  "",
		},
		editDownloadProvider:       {
			label:    "",
			category: "torrent",
			baseUrl:  "",
		},
	};
}

function createDownloadSearchSettings(
	patch: Partial<DownloadSearchSettings> = {},
): DownloadSearchSettings {
	return {
		providers:      [
			{
				id:        "provider-1",
				label:     "Provider 1",
				category:  "torrent",
				baseUrl:   "https://provider.example/search?q={query}",
				isBuiltIn: false,
				enabled:   true,
				sortOrder: 1,
			},
		],
		keywordPresets: [],
		queryPresets:   [],
		builderState:   {
			titleLanguage:     "english",
			selectedPresetIds: [],
			customQueryText:   "",
		},
		browserConfig:  { mode: "system" },
		...patch,
	};
}

describe(
	"preferences-settings-model",
	() => {
		it(
			"applies loaded scalar settings immutably",
			() => {
				const state = createPreferencesState();

				expect(applyLoadedPreferredTitleLanguage(
					state,
					"romaji",
				).preferredTitleLanguage).toBe("romaji");
				expect(applyLoadedDevModeStatus(
					state,
					false,
				).isDevModeEnabled).toBe(false);
				expect(applyLoadedCanvasDiagnosticsStatus(
					state,
					true,
				).isCanvasDiagnosticsEnabled).toBe(true);
				expect(state.preferredTitleLanguage).toBe("english");
			},
		);

		it(
			"fails dev mode closed when the initial load cannot read the setting",
			() => {
				expect(recoverFailedDevModeLoad(createPreferencesState()).isDevModeEnabled).toBe(false);
			},
		);

		it(
			"applies download-search settings while preserving the previous custom path for system mode",
			() => {
				const state     = createPreferencesState();
				const nextState = applyLoadedDownloadSearchSettings(
					state,
					createDownloadSearchSettings(),
				);

				expect(nextState.downloadBrowserConfig).toEqual({ mode: "system" });
				expect(nextState.downloadBrowserDraft).toEqual({ mode: "system" });
				expect(nextState.downloadBrowserCustomPath).toBe("/previous/browser");
				expect(nextState.downloadProviders).toHaveLength(1);
			},
		);

		it(
			"uses the loaded executable as the custom browser path when available",
			() => {
				const nextState = applyLoadedDownloadSearchSettings(
					createPreferencesState(),
					createDownloadSearchSettings({
						browserConfig: {
							mode:           "custom",
							executablePath: "/Applications/Browser.app",
						},
					}),
				);

				expect(nextState.downloadBrowserCustomPath).toBe("/Applications/Browser.app");
				expect(nextState.downloadBrowserDraft).toEqual({
					mode:           "custom",
					executablePath: "/Applications/Browser.app",
				});
			},
		);

		it(
			"rolls back optimistic preferences only when the attempted value is still current",
			() => {
				const pendingState = setOptimisticPreference(
					createPreferencesState(),
					"backgroundStyle",
					"synthwave",
				);

				expect(revertOptimisticPreferenceIfCurrent(
					pendingState,
					"backgroundStyle",
					"synthwave",
					"kanaMatrix",
				).backgroundStyle).toBe("kanaMatrix");

				const newerChoiceState = setOptimisticPreference(
					pendingState,
					"backgroundStyle",
					"kanaGrid",
				);

				expect(revertOptimisticPreferenceIfCurrent(
					newerChoiceState,
					"backgroundStyle",
					"synthwave",
					"kanaMatrix",
				)).toBe(newerChoiceState);
			},
		);
	},
);
