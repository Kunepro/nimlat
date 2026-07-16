import type { AppUpdateStatus } from "@nimlat/types/app-update";
import {
	AnimeDbDownloadFacade,
	AppUpdateFacade,
} from "../../facades";

// Centralizes app-update and AnimeDB-release facade commands for Preferences.
// Hooks remain responsible for UI lifecycle, race guards, and local error states.
export function loadAppUpdateStatus() {
	return AppUpdateFacade.getStatus();
}

export function subscribeToAppUpdateStatusChanges(onStatus: (status: AppUpdateStatus) => void) {
	return AppUpdateFacade.statusChanges().subscribe(onStatus);
}

export function checkForAppUpdates() {
	return AppUpdateFacade.checkForUpdates();
}

export function runAppUpdateForStatus(status: AppUpdateStatus | null) {
	if (status?.state === "downloaded") {
		return AppUpdateFacade.installDownloadedUpdate();
	}

	return AppUpdateFacade.downloadUpdate();
}

export function loadAnimeDbReleaseStatus() {
	return AnimeDbDownloadFacade.getReleaseStatus();
}
