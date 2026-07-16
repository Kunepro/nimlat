import { UserDbFacade } from "@nimlat/database";
import type {
	CreateDownloadSearchKeywordPresetRequest,
	CreateDownloadSearchProviderRequest,
	CreateDownloadSearchQueryPresetRequest,
	DownloadBrowserConfig,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
	DownloadSearchSettings,
	SaveDownloadSearchBuilderStateRequest,
	UpdateDownloadSearchProviderRequest,
} from "@nimlat/types/download-search";
import {
	validateDownloadSearchKeywordPresetRequest,
	validateDownloadSearchProviderRequest,
	validateDownloadSearchQueryPresetRequest,
} from "./download-search-provider-validation";

class DownloadSearchSettingsService {
	public getSettings(): DownloadSearchSettings {
		return UserDbFacade.downloadSearch.getSettings();
	}

	public saveBuilderState(request: SaveDownloadSearchBuilderStateRequest): void {
		UserDbFacade.downloadSearch.saveBuilderState(request);
	}

	public saveBrowserConfig(config: DownloadBrowserConfig): void {
		UserDbFacade.downloadSearch.saveBrowserConfig(config);
	}

	public setProviderEnabled(providerId: string, enabled: boolean): void {
		UserDbFacade.downloadSearch.setProviderEnabled(
			providerId,
			enabled,
		);
	}

	public createProvider(request: CreateDownloadSearchProviderRequest): DownloadSearchProvider {
		return UserDbFacade.downloadSearch.createProvider(validateDownloadSearchProviderRequest(request));
	}

	public updateProvider(request: UpdateDownloadSearchProviderRequest): DownloadSearchProvider {
		return UserDbFacade.downloadSearch.updateProvider(validateDownloadSearchProviderRequest(request));
	}

	public deleteProvider(providerId: string): void {
		UserDbFacade.downloadSearch.deleteProvider(providerId);
	}

	public createKeywordPreset(request: CreateDownloadSearchKeywordPresetRequest): DownloadSearchKeywordPreset {
		return UserDbFacade.downloadSearch.createKeywordPreset(validateDownloadSearchKeywordPresetRequest(request));
	}

	public createQueryPreset(request: CreateDownloadSearchQueryPresetRequest): DownloadSearchQueryPreset {
		return UserDbFacade.downloadSearch.createQueryPreset(validateDownloadSearchQueryPresetRequest(request));
	}

	public setQueryPresetEnabled(presetId: string, enabled: boolean): void {
		UserDbFacade.downloadSearch.setQueryPresetEnabled(
			presetId,
			enabled,
		);
	}

	public deleteQueryPreset(presetId: string): void {
		UserDbFacade.downloadSearch.deleteQueryPreset(presetId);
	}
}

export const downloadSearchSettingsService = new DownloadSearchSettingsService();
