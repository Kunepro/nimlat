import type {
	DownloadBrowserConfig,
	DownloadSearchProvider,
	DownloadSearchSettings,
} from "@nimlat/types/download-search";
import { DownloadSearchFacade } from "../../facades";
import type { DownloadProviderFormState } from "../../types/modals";
import {
	createDownloadBrowserDraftForMode,
	createDownloadProviderUpdateRequest,
} from "./download-search-preferences-model";

// Keeps Preferences hooks focused on React state transitions while this runner
// owns the facade command surface and request construction for download search settings.
export function loadDownloadSearchPreferencesSettings(): Promise<DownloadSearchSettings> {
	return DownloadSearchFacade.getSettings();
}

export function saveDownloadBrowserConfigDraft(
	mode: DownloadBrowserConfig["mode"],
	customPath: string,
): Promise<DownloadBrowserConfig> {
	const configToSave = createDownloadBrowserDraftForMode(
		mode,
		customPath,
	);

	return DownloadSearchFacade.saveBrowserConfig(configToSave)
		.then(() => configToSave);
}

export function pickDownloadBrowserExecutablePath(): Promise<string | null> {
	return DownloadSearchFacade.pickBrowserExecutable()
		.then((result) => {
			if (!result.success || !result.executablePath) {
				return null;
			}

			return result.executablePath;
		});
}

export function setDownloadProviderEnabledPreference(
	providerId: string,
	enabled: boolean,
): Promise<void> {
	return DownloadSearchFacade.setProviderEnabled(
		providerId,
		enabled,
	);
}

export function createDownloadProviderPreference(
	draft: DownloadProviderFormState,
): Promise<DownloadSearchProvider> {
	return DownloadSearchFacade.createProvider(draft);
}

export function updateDownloadProviderPreference(
	providerId: string,
	draft: DownloadProviderFormState,
): Promise<DownloadSearchProvider> {
	return DownloadSearchFacade.updateProvider(createDownloadProviderUpdateRequest(
		providerId,
		draft,
	));
}

export function deleteDownloadProviderPreference(providerId: string): Promise<void> {
	return DownloadSearchFacade.deleteProvider(providerId);
}
