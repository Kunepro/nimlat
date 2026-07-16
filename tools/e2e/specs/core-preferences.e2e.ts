import {
	expect,
	test,
} from "@playwright/test";
import { ToasterType } from "../../../src/shared/types/toaster";
import {
	callRendererApi,
	readRendererEvents,
	startRendererEventRecorder,
	stopRendererEventRecorder,
} from "../e2e-renderer-api";
import type { NimlatE2ETestContext } from "../e2e-test-context";
import {
	evaluateRenderer,
	openHarnessPage,
	runMainCommand,
	wait,
	waitForRendererCondition,
} from "../playwright-electron-helpers";

export function registerCorePreferenceTests(context: NimlatE2ETestContext): void {
	test(
		"main-process toaster bridge renders renderer notifications",
		async () => {
			const electronApp = context.getElectronApp();
			const message     = `E2E toaster ${ Date.now() }`;
			const libraryUi   = await openHarnessPage(
				electronApp,
				"library",
			);

			try {
				await wait(250);
				await runMainCommand(
					electronApp,
					"sendToasterMessage",
					[
						ToasterType.SUCCESS,
						message,
					],
				);

				await expect(libraryUi.page.getByText(message)).toBeVisible();
			} finally {
				await runMainCommand(
					electronApp,
					"destroyWindow",
					[ libraryUi.windowId ],
				);
			}
		},
	);

	test(
		"canvas diagnostics preference persistence",
		async () => {
			const basePage    = context.getBasePage();
			const electronApp = context.getElectronApp();

			const rawCanvasDiagnosticsSetting = await runMainCommand(
				electronApp,
				"getCanvasDiagnosticsRawSetting",
			);
			expect(rawCanvasDiagnosticsSetting).toBe("false");

			await evaluateRenderer<void>(
				basePage,
				`(() => {
					window.__canvasDiagnosticsEvents = [];
					window.__unsubscribeCanvasDiagnostics = window.electronAPI.userConfig.onCanvasDiagnosticsStatusChanged((enabled) => {
						window.__canvasDiagnosticsEvents.push(enabled);
					});
				})()`,
			);
			await expect(evaluateRenderer<boolean>(
				basePage,
				"window.electronAPI.userConfig.getCanvasDiagnosticsStatus()",
			)).resolves.toBe(false);

			await evaluateRenderer<void>(
				basePage,
				"window.electronAPI.userConfig.setCanvasDiagnosticsStatus(true)",
			);
			await expect(evaluateRenderer<boolean>(
				basePage,
				"window.electronAPI.userConfig.getCanvasDiagnosticsStatus()",
			)).resolves.toBe(true);
			await waitForRendererCondition(
				basePage,
				"window.__canvasDiagnosticsEvents?.includes(true) === true",
			);
			await evaluateRenderer<void>(
				basePage,
				"window.__unsubscribeCanvasDiagnostics?.()",
			);
		},
	);

	test(
		"user config events, filters, and route persistence",
		async () => {
			const basePage = context.getBasePage();

			await startRendererEventRecorder(
				basePage,
				"adultContentStatusChanged",
			);
			await startRendererEventRecorder(
				basePage,
				"backgroundStyleChanged",
			);
			await startRendererEventRecorder(
				basePage,
				"preferredTitleLanguageChanged",
			);

			await callRendererApi(
				basePage,
				"userConfig",
				"setAdultContentStatus",
				true,
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setBackgroundStyle",
				"synthwave",
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setPreferredTitleLanguage",
				"romaji",
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setLibraryDisplayFilters",
				{
					adultFilter: "adult",
					displayMode: "rawMedia",
					genreNames:  [ "Action" ],
					tagNames:    [ "Time Skip" ],
				},
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setLastRoute",
				"/groups/ignored",
			);

			await expect(callRendererApi(
				basePage,
				"userConfig",
				"getAdultContentStatus",
			)).resolves.toBe(true);
			await expect(callRendererApi(
				basePage,
				"userConfig",
				"getBackgroundStyle",
			)).resolves.toBe("synthwave");
			await expect(callRendererApi(
				basePage,
				"userConfig",
				"getPreferredTitleLanguage",
			)).resolves.toBe("romaji");
			const filters = await callRendererApi(
				basePage,
				"userConfig",
				"getLibraryDisplayFilters",
			);
			expect(filters).toEqual({
				adultFilter: "adult",
				displayMode: "rawMedia",
				genreNames:  [],
				tagNames:    [],
			});
			await expect(callRendererApi(
				basePage,
				"userConfig",
				"getLastRoute",
			)).resolves.toBe("/groups/ignored");
			expect(await readRendererEvents(
				basePage,
				"adultContentStatusChanged",
			)).toContain(true);
			expect(await readRendererEvents(
				basePage,
				"backgroundStyleChanged",
			)).toContain("synthwave");
			expect(await readRendererEvents(
				basePage,
				"preferredTitleLanguageChanged",
			)).toContain("romaji");
			await callRendererApi(
				basePage,
				"userConfig",
				"setAdultContentStatus",
				false,
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setPreferredTitleLanguage",
				"english",
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setLibraryDisplayFilters",
				{
					adultFilter: "mixed",
					displayMode: "groups",
					genreNames:  [],
					tagNames:    [],
				},
			);
			await stopRendererEventRecorder(
				basePage,
				"adultContentStatusChanged",
			);
			await stopRendererEventRecorder(
				basePage,
				"backgroundStyleChanged",
			);
			await stopRendererEventRecorder(
				basePage,
				"preferredTitleLanguageChanged",
			);
		},
	);

	test(
		"user config persistence across real Electron restart",
		async () => {
			const basePage = context.getBasePage();

			await callRendererApi(
				basePage,
				"userConfig",
				"setAdultContentStatus",
				true,
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setBackgroundStyle",
				"kanaGrid",
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setPreferredTitleLanguage",
				"native",
			);
			await callRendererApi(
				basePage,
				"userConfig",
				"setLastRoute",
				"/release-watch/e2e-restart",
			);

			await context.restartSession();
			const restartedPage = context.getBasePage();

			await expect(callRendererApi(
				restartedPage,
				"userConfig",
				"getAdultContentStatus",
			)).resolves.toBe(true);
			await expect(callRendererApi(
				restartedPage,
				"userConfig",
				"getBackgroundStyle",
			)).resolves.toBe("kanaGrid");
			await expect(callRendererApi(
				restartedPage,
				"userConfig",
				"getPreferredTitleLanguage",
			)).resolves.toBe("native");
			await expect(callRendererApi(
				restartedPage,
				"userConfig",
				"getLastRoute",
			)).resolves.toBe("/release-watch/e2e-restart");

			await callRendererApi(
				restartedPage,
				"userConfig",
				"setAdultContentStatus",
				false,
			);
			await callRendererApi(
				restartedPage,
				"userConfig",
				"setBackgroundStyle",
				"kanaMatrix",
			);
			await callRendererApi(
				restartedPage,
				"userConfig",
				"setPreferredTitleLanguage",
				"english",
			);
		},
	);

	test(
		"download search settings persistence and disabled-provider guard",
		async () => {
			const basePage              = context.getBasePage();
			const { ids }               = context.getSnapshot();
			const unknownProviderResult = await callRendererApi(
				basePage,
				"downloadSearch",
				"openProviderSearch",
				{
					providerId: "missing-e2e-provider",
					query:      "nimlat e2e",
					mediaId:    ids.baseMedia,
				},
			);
			expect(unknownProviderResult.success).toBe(false);
			expect(unknownProviderResult.error).toContain("Unknown download search provider");

			const result = await evaluateRenderer<{
				providerId: string;
				keywordPresetId: string;
				queryPresetId: string;
				disabledOpen: { success: boolean; error?: string };
				settings: {
					providers: Array<{ id: string; label: string; enabled: boolean; baseUrl: string }>;
					keywordPresets: Array<{ id: string; label: string; value: string }>;
					queryPresets: Array<{ id: string; label: string; enabled: boolean }>;
					builderState: {
						titleLanguage: string;
						selectedPresetIds: string[];
						customQueryText: string;
					};
					browserConfig: {
						mode: string;
						executablePath?: string;
					};
				};
			}>(
				basePage,
				`(async () => {
					const provider = await window.electronAPI.downloadSearch.createProvider({
						label: "E2E Provider",
						category: "torrent",
						baseUrl: "https://example.com/search?q={query}",
					});
					const keywordPreset = await window.electronAPI.downloadSearch.createKeywordPreset({
						label: "E2E 1080p",
						value: "1080p",
						category: "quality",
					});
					const queryPreset = await window.electronAPI.downloadSearch.createQueryPreset({
						label: "E2E Query",
						selectedPresetIds: [keywordPreset.id],
						customQueryText: "dual audio",
					});
					await window.electronAPI.downloadSearch.saveBuilderState({
						titleLanguage: "romaji",
						selectedPresetIds: [keywordPreset.id],
						customQueryText: "batch",
						mediaId: ${ ids.baseMedia },
						lastUsedProviderId: provider.id,
					});
					await window.electronAPI.downloadSearch.saveBrowserConfig({
						mode: "custom",
						executablePath: "/Applications/E2E Browser.app",
					});
					await window.electronAPI.downloadSearch.setProviderEnabled(provider.id, false);
					await window.electronAPI.downloadSearch.setQueryPresetEnabled(queryPreset.id, false);
					const disabledOpen = await window.electronAPI.downloadSearch.openProviderSearch({
						providerId: provider.id,
						query: "nimlat e2e",
						mediaId: ${ ids.baseMedia },
					});
					const settings = await window.electronAPI.downloadSearch.getSettings();
					return {
						providerId: provider.id,
						keywordPresetId: keywordPreset.id,
						queryPresetId: queryPreset.id,
						disabledOpen,
						settings,
					};
				})()`,
			);

			expect(result.disabledOpen.success).toBe(false);
			expect(result.disabledOpen.error).toContain("disabled");
			expect(result.settings.providers.some((provider) =>
				provider.id === result.providerId
				&& provider.label === "E2E Provider"
				&& provider.enabled === false
				&& provider.baseUrl === "https://example.com/search?q={query}",
			)).toBe(true);
			expect(result.settings.keywordPresets.some((preset) =>
				preset.id === result.keywordPresetId
				&& preset.label === "E2E 1080p"
				&& preset.value === "1080p",
			)).toBe(true);
			expect(result.settings.queryPresets.some((preset) =>
				preset.id === result.queryPresetId
				&& preset.label === "E2E Query"
				&& preset.enabled === false,
			)).toBe(true);
			expect(result.settings.builderState).toEqual({
				titleLanguage:     "romaji",
				selectedPresetIds: [ result.keywordPresetId ],
				customQueryText:   "batch",
			});
			expect(result.settings.browserConfig).toEqual({
				mode:           "custom",
				executablePath: "/Applications/E2E Browser.app",
			});

			await evaluateRenderer<void>(
				basePage,
				`Promise.all([
					window.electronAPI.downloadSearch.deleteProvider("${ result.providerId }"),
					window.electronAPI.downloadSearch.deleteQueryPreset("${ result.queryPresetId }"),
				])`,
			);
		},
	);
}
