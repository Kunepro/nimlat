import type {
	CreateDownloadSearchKeywordPresetRequest,
	CreateDownloadSearchProviderRequest,
	CreateDownloadSearchQueryPresetRequest,
	DownloadBrowserConfig,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
	DownloadSearchSettings,
	OpenDownloadSearchRequest,
	OpenDownloadSearchResult,
	PickDownloadBrowserExecutableResult,
	SaveDownloadSearchBuilderStateRequest,
	UpdateDownloadSearchProviderRequest,
} from "@nimlat/types/download-search";
import { downloadSearchBrowserPicker } from "./download-search-browser-picker";
import { downloadSearchOpenService } from "./download-search-open-service";
import { downloadSearchSettingsService } from "./download-search-settings-service";

export class DownloadSearchService {
	public static getSettings(): DownloadSearchSettings {
		return downloadSearchSettingsService.getSettings();
	}

	public static saveBuilderState(request: SaveDownloadSearchBuilderStateRequest): void {
		downloadSearchSettingsService.saveBuilderState(request);
	}

	public static saveBrowserConfig(config: DownloadBrowserConfig): void {
		downloadSearchSettingsService.saveBrowserConfig(config);
	}

	public static setProviderEnabled(providerId: string, enabled: boolean): void {
		downloadSearchSettingsService.setProviderEnabled(
			providerId,
			enabled,
		);
	}

	public static createProvider(request: CreateDownloadSearchProviderRequest): DownloadSearchProvider {
		return downloadSearchSettingsService.createProvider(request);
	}

	public static updateProvider(request: UpdateDownloadSearchProviderRequest): DownloadSearchProvider {
		return downloadSearchSettingsService.updateProvider(request);
	}

	public static deleteProvider(providerId: string): void {
		downloadSearchSettingsService.deleteProvider(providerId);
	}

	public static createKeywordPreset(request: CreateDownloadSearchKeywordPresetRequest): DownloadSearchKeywordPreset {
		return downloadSearchSettingsService.createKeywordPreset(request);
	}

	public static createQueryPreset(request: CreateDownloadSearchQueryPresetRequest): DownloadSearchQueryPreset {
		return downloadSearchSettingsService.createQueryPreset(request);
	}

	public static setQueryPresetEnabled(presetId: string, enabled: boolean): void {
		downloadSearchSettingsService.setQueryPresetEnabled(
			presetId,
			enabled,
		);
	}

	public static deleteQueryPreset(presetId: string): void {
		downloadSearchSettingsService.deleteQueryPreset(presetId);
	}

	public static async openProviderSearch(request: OpenDownloadSearchRequest): Promise<OpenDownloadSearchResult> {
		return downloadSearchOpenService.openProviderSearch(request);
	}

	public static async pickBrowserExecutable(): Promise<PickDownloadBrowserExecutableResult> {
		return downloadSearchBrowserPicker.pickExecutable();
	}
}
