import type { ElectronAPI } from "@nimlat/types/electron-api";
import { UserConfigStatusService } from "../services/user-config-status-service";

type UserConfigApi = ElectronAPI["userConfig"];
type UserConfigStatusApi = typeof UserConfigStatusService;

export class UserConfigFacade {
	public static getAnimeDbVersion(...args: Parameters<UserConfigApi["getAnimeDbVersion"]>): ReturnType<UserConfigApi["getAnimeDbVersion"]> {
		return window.electronAPI.userConfig.getAnimeDbVersion(...args);
	}

	public static setAnimeDbVersion(...args: Parameters<UserConfigApi["setAnimeDbVersion"]>): ReturnType<UserConfigApi["setAnimeDbVersion"]> {
		return window.electronAPI.userConfig.setAnimeDbVersion(...args);
	}

	public static getAdultContentStatus(...args: Parameters<UserConfigApi["getAdultContentStatus"]>): ReturnType<UserConfigApi["getAdultContentStatus"]> {
		return window.electronAPI.userConfig.getAdultContentStatus(...args);
	}

	public static setAdultContentStatus(...args: Parameters<UserConfigApi["setAdultContentStatus"]>): ReturnType<UserConfigApi["setAdultContentStatus"]> {
		return window.electronAPI.userConfig.setAdultContentStatus(...args);
	}

	public static adultContentStatusChanges(...args: Parameters<UserConfigStatusApi["adultContentStatusChanges"]>): ReturnType<UserConfigStatusApi["adultContentStatusChanges"]> {
		return UserConfigStatusService.adultContentStatusChanges(...args);
	}

	public static getBackgroundStyle(...args: Parameters<UserConfigApi["getBackgroundStyle"]>): ReturnType<UserConfigApi["getBackgroundStyle"]> {
		return window.electronAPI.userConfig.getBackgroundStyle(...args);
	}

	public static setBackgroundStyle(...args: Parameters<UserConfigApi["setBackgroundStyle"]>): ReturnType<UserConfigApi["setBackgroundStyle"]> {
		return window.electronAPI.userConfig.setBackgroundStyle(...args);
	}

	public static backgroundStyleChanges(...args: Parameters<UserConfigStatusApi["backgroundStyleChanges"]>): ReturnType<UserConfigStatusApi["backgroundStyleChanges"]> {
		return UserConfigStatusService.backgroundStyleChanges(...args);
	}

	public static getPreferredTitleLanguage(...args: Parameters<UserConfigApi["getPreferredTitleLanguage"]>): ReturnType<UserConfigApi["getPreferredTitleLanguage"]> {
		return window.electronAPI.userConfig.getPreferredTitleLanguage(...args);
	}

	public static setPreferredTitleLanguage(...args: Parameters<UserConfigApi["setPreferredTitleLanguage"]>): ReturnType<UserConfigApi["setPreferredTitleLanguage"]> {
		return window.electronAPI.userConfig.setPreferredTitleLanguage(...args);
	}

	public static preferredTitleLanguageChanges(...args: Parameters<UserConfigStatusApi["preferredTitleLanguageChanges"]>): ReturnType<UserConfigStatusApi["preferredTitleLanguageChanges"]> {
		return UserConfigStatusService.preferredTitleLanguageChanges(...args);
	}

	public static getDevModeStatus(...args: Parameters<UserConfigStatusApi["getDevModeStatus"]>): ReturnType<UserConfigStatusApi["getDevModeStatus"]> {
		return UserConfigStatusService.getDevModeStatus(...args);
	}

	public static getAdminModeStatus(...args: Parameters<UserConfigStatusApi["getAdminModeStatus"]>): ReturnType<UserConfigStatusApi["getAdminModeStatus"]> {
		return UserConfigStatusService.getAdminModeStatus(...args);
	}

	public static getCanvasDiagnosticsStatus(...args: Parameters<UserConfigStatusApi["getCanvasDiagnosticsStatus"]>): ReturnType<UserConfigStatusApi["getCanvasDiagnosticsStatus"]> {
		return UserConfigStatusService.getCanvasDiagnosticsStatus(...args);
	}

	public static setCanvasDiagnosticsStatus(...args: Parameters<UserConfigStatusApi["setCanvasDiagnosticsStatus"]>): ReturnType<UserConfigStatusApi["setCanvasDiagnosticsStatus"]> {
		return UserConfigStatusService.setCanvasDiagnosticsStatus(...args);
	}

	public static canvasDiagnosticsStatusChanges(...args: Parameters<UserConfigStatusApi["canvasDiagnosticsStatusChanges"]>): ReturnType<UserConfigStatusApi["canvasDiagnosticsStatusChanges"]> {
		return UserConfigStatusService.canvasDiagnosticsStatusChanges(...args);
	}

	public static getLibraryDisplayFilters(...args: Parameters<UserConfigApi["getLibraryDisplayFilters"]>): ReturnType<UserConfigApi["getLibraryDisplayFilters"]> {
		return window.electronAPI.userConfig.getLibraryDisplayFilters(...args);
	}

	public static setLibraryDisplayFilters(...args: Parameters<UserConfigApi["setLibraryDisplayFilters"]>): ReturnType<UserConfigApi["setLibraryDisplayFilters"]> {
		return window.electronAPI.userConfig.setLibraryDisplayFilters(...args);
	}

	public static getLastRoute(...args: Parameters<UserConfigApi["getLastRoute"]>): ReturnType<UserConfigApi["getLastRoute"]> {
		return window.electronAPI.userConfig.getLastRoute(...args);
	}

	public static setLastRoute(...args: Parameters<UserConfigApi["setLastRoute"]>): ReturnType<UserConfigApi["setLastRoute"]> {
		return window.electronAPI.userConfig.setLastRoute(...args);
	}
}
