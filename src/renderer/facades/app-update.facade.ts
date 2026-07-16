import type { ElectronAPI } from "@nimlat/types/electron-api";
import { AppUpdateEventService } from "../services/app-update-event-service";

type AppUpdateApi = ElectronAPI["appUpdate"];
type AppUpdateEventsApi = typeof AppUpdateEventService;

export class AppUpdateFacade {
	// Keep the platform capability behind the preload facade so UI code does not re-derive the unsigned macOS policy.
	public static isIntegratedUpdaterVisible(...args: Parameters<AppUpdateApi["isIntegratedUpdaterVisible"]>): ReturnType<AppUpdateApi["isIntegratedUpdaterVisible"]> {
		return window.electronAPI.appUpdate.isIntegratedUpdaterVisible(...args);
	}

	public static getStatus(...args: Parameters<AppUpdateApi["getStatus"]>): ReturnType<AppUpdateApi["getStatus"]> {
		return window.electronAPI.appUpdate.getStatus(...args);
	}

	public static checkForUpdates(...args: Parameters<AppUpdateApi["checkForUpdates"]>): ReturnType<AppUpdateApi["checkForUpdates"]> {
		return window.electronAPI.appUpdate.checkForUpdates(...args);
	}

	public static downloadUpdate(...args: Parameters<AppUpdateApi["downloadUpdate"]>): ReturnType<AppUpdateApi["downloadUpdate"]> {
		return window.electronAPI.appUpdate.downloadUpdate(...args);
	}

	public static installDownloadedUpdate(...args: Parameters<AppUpdateApi["installDownloadedUpdate"]>): ReturnType<AppUpdateApi["installDownloadedUpdate"]> {
		return window.electronAPI.appUpdate.installDownloadedUpdate(...args);
	}

	public static statusChanges(...args: Parameters<AppUpdateEventsApi["statusChanges"]>): ReturnType<AppUpdateEventsApi["statusChanges"]> {
		return AppUpdateEventService.statusChanges(...args);
	}
}
