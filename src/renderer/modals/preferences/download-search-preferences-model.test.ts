// @vitest-environment node

import type { DownloadSearchProvider } from "@nimlat/types/download-search";
import {
	describe,
	expect,
	it,
} from "vitest";
import type { PreferencesModalState } from "../../types/modals";
import {
	appendCreatedDownloadProvider,
	applyPickedDownloadBrowserExecutable,
	cancelAddingDownloadProviderForm,
	cancelEditingDownloadProviderDraft,
	commitDownloadBrowserConfig,
	createDownloadBrowserDraftForMode,
	createDownloadBrowserDraftForPath,
	createDownloadProviderUpdateRequest,
	getRevertedDownloadBrowserCustomPath,
	removeDownloadProvider,
	replaceUpdatedDownloadProvider,
	revertDownloadBrowserDraftChanges,
	setDownloadProviderEnabled,
	startEditingDownloadProviderDraft,
	toggleAddingDownloadProviderForm,
	updateDownloadBrowserCustomPathDraft,
	updateDownloadBrowserModeDraft,
	updateEditDownloadProviderDraft,
	updateNewDownloadProviderDraft,
} from "./download-search-preferences-model";

function createPreferencesState(): PreferencesModalState {
	return {
		isOpen:                     true,
		isAdultContentEnabled:      false,
		backgroundStyle:            "kanaMatrix",
		preferredTitleLanguage:     "english",
		isDevModeEnabled:           false,
		isCanvasDiagnosticsEnabled: false,
		downloadBrowserConfig:      {
			mode:           "custom",
			executablePath: "/saved/browser",
		},
		downloadBrowserDraft:       {
			mode: "system",
		},
		downloadBrowserCustomPath:  "/previous/browser",
		downloadProviders:          [],
		isAddingDownloadProvider:   false,
		editingDownloadProviderId:  "provider-1",
		newDownloadProvider:        {
			label:    "Old provider",
			category: "torrent",
			baseUrl:  "https://old.example/search?q={query}",
		},
		editDownloadProvider:       {
			label:    "Edit provider",
			category: "index",
			baseUrl:  "https://edit.example/search?q={query}",
		},
	};
}

function createProvider(
	id: string,
	patch: Partial<DownloadSearchProvider> = {},
): DownloadSearchProvider {
	return {
		id,
		label:     `Provider ${ id }`,
		category:  "torrent",
		baseUrl:   `https://${ id }.example/search?q={query}`,
		isBuiltIn: false,
		enabled:   true,
		sortOrder: 1,
		...patch,
	};
}

describe(
	"download-search-preferences-model",
	() => {
		it(
			"builds browser drafts from mode changes",
			() => {
				expect(createDownloadBrowserDraftForMode(
					"system",
					"/Applications/Browser.app",
				)).toEqual({ mode: "system" });
				expect(createDownloadBrowserDraftForMode(
					"custom",
					"/Applications/Browser.app",
				)).toEqual({
					mode:           "custom",
					executablePath: "/Applications/Browser.app",
				});
			},
		);

		it(
			"forces custom mode when the executable path changes",
			() => {
				expect(createDownloadBrowserDraftForPath("/usr/bin/browser")).toEqual({
					mode:           "custom",
					executablePath: "/usr/bin/browser",
				});
			},
		);

		it(
			"keeps the previous custom path when reverting to a system browser config",
			() => {
				expect(getRevertedDownloadBrowserCustomPath(
					{ mode: "system" },
					"/previous/browser",
				)).toBe("/previous/browser");
				expect(getRevertedDownloadBrowserCustomPath(
					{
						mode:           "custom",
						executablePath: "/saved/browser",
					},
					"/previous/browser",
				)).toBe("/saved/browser");
			},
		);

		it(
			"patches provider form drafts immutably",
			() => {
				const state = createPreferencesState();

				expect(updateNewDownloadProviderDraft(
					state,
					{ label: "Nyaa" },
				).newDownloadProvider).toEqual({
					label:    "Nyaa",
					category: "torrent",
					baseUrl:  "https://old.example/search?q={query}",
				});
				expect(updateEditDownloadProviderDraft(
					state,
					{ category: "torrent" },
				).editDownloadProvider).toEqual({
					label:    "Edit provider",
					category: "torrent",
					baseUrl:  "https://edit.example/search?q={query}",
				});
				expect(state.newDownloadProvider.label).toBe("Old provider");
			},
		);

		it(
			"toggles add-provider mode and exits edit mode",
			() => {
				const state = createPreferencesState();

				expect(toggleAddingDownloadProviderForm(state)).toMatchObject({
					isAddingDownloadProvider:  true,
					editingDownloadProviderId: null,
				});
				expect(cancelAddingDownloadProviderForm({
					...state,
					isAddingDownloadProvider: true,
				})).toMatchObject({ isAddingDownloadProvider: false });
			},
		);

		it(
			"updates and reverts browser draft state",
			() => {
				const state = createPreferencesState();

				expect(updateDownloadBrowserModeDraft(
					state,
					"custom",
				).downloadBrowserDraft).toEqual({
					mode:           "custom",
					executablePath: "/previous/browser",
				});
				expect(updateDownloadBrowserCustomPathDraft(
					state,
					"/Applications/Firefox.app",
				)).toMatchObject({
					downloadBrowserCustomPath: "/Applications/Firefox.app",
					downloadBrowserDraft:      {
						mode:           "custom",
						executablePath: "/Applications/Firefox.app",
					},
				});
				expect(revertDownloadBrowserDraftChanges(state)).toMatchObject({
					downloadBrowserCustomPath: "/saved/browser",
					downloadBrowserDraft:      {
						mode:           "custom",
						executablePath: "/saved/browser",
					},
				});
			},
		);

		it(
			"applies provider persistence results immutably",
			() => {
				const provider        = createProvider("provider-1");
				const createdProvider = createProvider(
					"provider-2",
					{ sortOrder: 2 },
				);
				const state           = {
					...createPreferencesState(),
					downloadProviders:        [ provider ],
					isAddingDownloadProvider: true,
				};

				expect(setDownloadProviderEnabled(
					state,
					"provider-1",
					false,
				).downloadProviders[ 0 ]?.enabled).toBe(false);
				expect(appendCreatedDownloadProvider(
					state,
					createdProvider,
				)).toMatchObject({
					downloadProviders:        [
						provider,
						createdProvider,
					],
					isAddingDownloadProvider: false,
					newDownloadProvider:      {
						label:    "",
						category: "torrent",
						baseUrl:  "",
					},
				});
				expect(state.downloadProviders).toEqual([ provider ]);
			},
		);

		it(
			"manages provider edit and delete state immutably",
			() => {
				const provider        = createProvider(
					"provider-1",
					{
						label:    "Nyaa",
						category: "index",
						baseUrl:  "https://nyaa.example/search?q={query}",
					},
				);
				const updatedProvider = {
					...provider,
					label: "Nyaa.si",
				};
				const state           = {
					...createPreferencesState(),
					downloadProviders:         [ provider ],
					isAddingDownloadProvider:  true,
					editingDownloadProviderId: "provider-1",
				};

				expect(startEditingDownloadProviderDraft(
					state,
					"provider-1",
				)).toMatchObject({
					isAddingDownloadProvider:  false,
					editingDownloadProviderId: "provider-1",
					editDownloadProvider:      {
						label:    "Nyaa",
						category: "index",
						baseUrl:  "https://nyaa.example/search?q={query}",
					},
				});
				expect(startEditingDownloadProviderDraft(
					state,
					"missing-provider",
				)).toBe(state);
				expect(cancelEditingDownloadProviderDraft(state)).toMatchObject({
					editingDownloadProviderId: null,
					editDownloadProvider:      {
						label:    "",
						category: "torrent",
						baseUrl:  "",
					},
				});
				expect(replaceUpdatedDownloadProvider(
					state,
					updatedProvider,
				)).toMatchObject({
					downloadProviders:         [ updatedProvider ],
					editingDownloadProviderId: null,
				});
				expect(removeDownloadProvider(
					state,
					"provider-1",
				)).toMatchObject({
					downloadProviders:         [],
					editingDownloadProviderId: null,
				});
			},
		);

		it(
			"builds provider update requests from edit drafts",
			() => {
				expect(createDownloadProviderUpdateRequest(
					"provider-1",
					{
						label:    "Nyaa",
						category: "torrent",
						baseUrl:  "https://nyaa.example/search?q={query}",
					},
				)).toEqual({
					providerId: "provider-1",
					label:      "Nyaa",
					category:   "torrent",
					baseUrl:    "https://nyaa.example/search?q={query}",
				});
			},
		);

		it(
			"commits saved browser config and picked executables",
			() => {
				const state = createPreferencesState();

				expect(commitDownloadBrowserConfig(
					state,
					{ mode: "system" },
				)).toMatchObject({
					downloadBrowserConfig: { mode: "system" },
					downloadBrowserDraft:  { mode: "system" },
				});
				expect(applyPickedDownloadBrowserExecutable(
					state,
					"/Applications/Zen.app",
				)).toMatchObject({
					downloadBrowserCustomPath: "/Applications/Zen.app",
					downloadBrowserDraft:      {
						mode:           "custom",
						executablePath: "/Applications/Zen.app",
					},
				});
			},
		);
	},
);
