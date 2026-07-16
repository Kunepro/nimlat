import type { ElectronAPI } from "@nimlat/types/electron-api";
import { DownloadSearchSettingsChangeService } from "../services/download-search-settings-change-service";

type DownloadSearchApi = ElectronAPI["downloadSearch"];
type DownloadSearchSettingsChangeApi = typeof DownloadSearchSettingsChangeService;

export class DownloadSearchFacade {
	public static getSettings(...args: Parameters<DownloadSearchApi["getSettings"]>): ReturnType<DownloadSearchApi["getSettings"]> {
		return window.electronAPI.downloadSearch.getSettings(...args);
	}

	public static settingsChanges(...args: Parameters<DownloadSearchSettingsChangeApi["settingsChanges"]>): ReturnType<DownloadSearchSettingsChangeApi["settingsChanges"]> {
		return DownloadSearchSettingsChangeService.settingsChanges(...args);
	}

	public static saveBuilderState(...args: Parameters<DownloadSearchApi["saveBuilderState"]>): ReturnType<DownloadSearchApi["saveBuilderState"]> {
		return window.electronAPI.downloadSearch.saveBuilderState(...args);
	}

	public static saveBrowserConfig(...args: Parameters<DownloadSearchSettingsChangeApi["saveBrowserConfig"]>): ReturnType<DownloadSearchSettingsChangeApi["saveBrowserConfig"]> {
		return DownloadSearchSettingsChangeService.saveBrowserConfig(...args);
	}

	public static setProviderEnabled(...args: Parameters<DownloadSearchSettingsChangeApi["setProviderEnabled"]>): ReturnType<DownloadSearchSettingsChangeApi["setProviderEnabled"]> {
		return DownloadSearchSettingsChangeService.setProviderEnabled(...args);
	}

	public static createProvider(...args: Parameters<DownloadSearchSettingsChangeApi["createProvider"]>): ReturnType<DownloadSearchSettingsChangeApi["createProvider"]> {
		return DownloadSearchSettingsChangeService.createProvider(...args);
	}

	public static updateProvider(...args: Parameters<DownloadSearchSettingsChangeApi["updateProvider"]>): ReturnType<DownloadSearchSettingsChangeApi["updateProvider"]> {
		return DownloadSearchSettingsChangeService.updateProvider(...args);
	}

	public static deleteProvider(...args: Parameters<DownloadSearchSettingsChangeApi["deleteProvider"]>): ReturnType<DownloadSearchSettingsChangeApi["deleteProvider"]> {
		return DownloadSearchSettingsChangeService.deleteProvider(...args);
	}

	public static createKeywordPreset(...args: Parameters<DownloadSearchSettingsChangeApi["createKeywordPreset"]>): ReturnType<DownloadSearchSettingsChangeApi["createKeywordPreset"]> {
		return DownloadSearchSettingsChangeService.createKeywordPreset(...args);
	}

	public static createQueryPreset(...args: Parameters<DownloadSearchSettingsChangeApi["createQueryPreset"]>): ReturnType<DownloadSearchSettingsChangeApi["createQueryPreset"]> {
		return DownloadSearchSettingsChangeService.createQueryPreset(...args);
	}

	public static setQueryPresetEnabled(...args: Parameters<DownloadSearchSettingsChangeApi["setQueryPresetEnabled"]>): ReturnType<DownloadSearchSettingsChangeApi["setQueryPresetEnabled"]> {
		return DownloadSearchSettingsChangeService.setQueryPresetEnabled(...args);
	}

	public static deleteQueryPreset(...args: Parameters<DownloadSearchSettingsChangeApi["deleteQueryPreset"]>): ReturnType<DownloadSearchSettingsChangeApi["deleteQueryPreset"]> {
		return DownloadSearchSettingsChangeService.deleteQueryPreset(...args);
	}

	public static openProviderSearch(...args: Parameters<DownloadSearchApi["openProviderSearch"]>): ReturnType<DownloadSearchApi["openProviderSearch"]> {
		return window.electronAPI.downloadSearch.openProviderSearch(...args);
	}

	public static pickBrowserExecutable(...args: Parameters<DownloadSearchApi["pickBrowserExecutable"]>): ReturnType<DownloadSearchApi["pickBrowserExecutable"]> {
		return window.electronAPI.downloadSearch.pickBrowserExecutable(...args);
	}
}
