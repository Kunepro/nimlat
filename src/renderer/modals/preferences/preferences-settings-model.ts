import type { DownloadSearchSettings } from "@nimlat/types/download-search";
import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import type { PreferencesModalState } from "../../types/modals";

export type OptimisticPreferenceKey =
	| "isAdultContentEnabled"
	| "backgroundStyle"
	| "preferredTitleLanguage"
	| "isCanvasDiagnosticsEnabled";

export function applyLoadedBackgroundStyle(
	state: PreferencesModalState,
	backgroundStyle: BackgroundStyle,
): PreferencesModalState {
	return {
		...state,
		backgroundStyle,
	};
}

export function applyLoadedPreferredTitleLanguage(
	state: PreferencesModalState,
	preferredTitleLanguage: PreferredTitleLanguage,
): PreferencesModalState {
	return {
		...state,
		preferredTitleLanguage,
	};
}

export function applyLoadedDevModeStatus(
	state: PreferencesModalState,
	isDevModeEnabled: boolean,
): PreferencesModalState {
	return {
		...state,
		isDevModeEnabled,
	};
}

export function recoverFailedDevModeLoad(state: PreferencesModalState): PreferencesModalState {
	// Dev-only controls must fail closed so a transient config read error does not expose admin tooling.
	return {
		...state,
		isDevModeEnabled: false,
	};
}

export function applyLoadedCanvasDiagnosticsStatus(
	state: PreferencesModalState,
	isCanvasDiagnosticsEnabled: boolean,
): PreferencesModalState {
	return {
		...state,
		isCanvasDiagnosticsEnabled,
	};
}

export function applyLoadedDownloadSearchSettings(
	state: PreferencesModalState,
	settings: DownloadSearchSettings,
): PreferencesModalState {
	return {
		...state,
		downloadBrowserConfig:     settings.browserConfig,
		downloadBrowserDraft:      settings.browserConfig,
		downloadBrowserCustomPath: settings.browserConfig.executablePath ?? state.downloadBrowserCustomPath,
		downloadProviders:         settings.providers,
	};
}

export function setOptimisticPreference<K extends OptimisticPreferenceKey>(
	state: PreferencesModalState,
	key: K,
	value: PreferencesModalState[K],
): PreferencesModalState {
	return {
		...state,
		[ key ]: value,
	};
}

export function revertOptimisticPreferenceIfCurrent<K extends OptimisticPreferenceKey>(
	state: PreferencesModalState,
	key: K,
	attemptedValue: PreferencesModalState[K],
	previousValue: PreferencesModalState[K],
): PreferencesModalState {
	// Only roll back the failed write when the user has not already selected a newer value.
	return state[ key ] === attemptedValue
		? setOptimisticPreference(
			state,
			key,
			previousValue,
		)
		: state;
}
