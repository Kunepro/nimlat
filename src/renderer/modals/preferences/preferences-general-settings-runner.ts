import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import { UserConfigFacade } from "../../facades";

// Preferences hooks own optimistic UI and rollback behavior. This runner keeps
// the UserConfig facade command/read surface centralized for general settings.
export function loadAdultContentPreference() {
	return UserConfigFacade.getAdultContentStatus();
}

export function loadBackgroundStylePreference() {
	return UserConfigFacade.getBackgroundStyle();
}

export function loadPreferredTitleLanguagePreference() {
	return UserConfigFacade.getPreferredTitleLanguage();
}

export function loadDevModePreference() {
	return UserConfigFacade.getDevModeStatus();
}

export function loadCanvasDiagnosticsPreference() {
	return UserConfigFacade.getCanvasDiagnosticsStatus();
}

export function saveAdultContentPreference(enabled: boolean) {
	return UserConfigFacade.setAdultContentStatus(enabled);
}

export function saveBackgroundStylePreference(style: BackgroundStyle) {
	return UserConfigFacade.setBackgroundStyle(style);
}

export function savePreferredTitleLanguagePreference(language: PreferredTitleLanguage) {
	return UserConfigFacade.setPreferredTitleLanguage(language);
}

export function saveCanvasDiagnosticsPreference(enabled: boolean) {
	return UserConfigFacade.setCanvasDiagnosticsStatus(enabled);
}
