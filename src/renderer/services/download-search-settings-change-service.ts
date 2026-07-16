import type {
	CreateDownloadSearchKeywordPresetRequest,
	CreateDownloadSearchProviderRequest,
	CreateDownloadSearchQueryPresetRequest,
	DownloadBrowserConfig,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
	UpdateDownloadSearchProviderRequest,
} from "@nimlat/types/download-search";
import {
	Observable,
	Subject,
} from "rxjs";

const downloadSearchSettingsChanged$ = new Subject<void>();

// Download-search writes need a local renderer invalidation because multiple
// mounted surfaces read the same settings snapshot through IPC.
class DownloadSearchSettingsChangeServiceImpl {
	public settingsChanges(): Observable<void> {
		// Expose fan-out as a stream so consumers own their subscriptions instead
		// of passing callback behavior into the service.
		return downloadSearchSettingsChanged$.asObservable();
	}

	public saveBrowserConfig(config: DownloadBrowserConfig): Promise<void> {
		return window.electronAPI.downloadSearch.saveBrowserConfig(config)
			.then(() => {
				this.notifySettingsChanged();
			});
	}

	public setProviderEnabled(providerId: string, enabled: boolean): Promise<void> {
		return window.electronAPI.downloadSearch.setProviderEnabled(
			providerId,
			enabled,
		)
			.then(() => {
				this.notifySettingsChanged();
			});
	}

	public createProvider(request: CreateDownloadSearchProviderRequest): Promise<DownloadSearchProvider> {
		return window.electronAPI.downloadSearch.createProvider(request)
			.then((provider) => {
				this.notifySettingsChanged();
				return provider;
			});
	}

	public updateProvider(request: UpdateDownloadSearchProviderRequest): Promise<DownloadSearchProvider> {
		return window.electronAPI.downloadSearch.updateProvider(request)
			.then((provider) => {
				this.notifySettingsChanged();
				return provider;
			});
	}

	public deleteProvider(providerId: string): Promise<void> {
		return window.electronAPI.downloadSearch.deleteProvider(providerId)
			.then(() => {
				this.notifySettingsChanged();
			});
	}

	public createKeywordPreset(request: CreateDownloadSearchKeywordPresetRequest): Promise<DownloadSearchKeywordPreset> {
		return window.electronAPI.downloadSearch.createKeywordPreset(request)
			.then((preset) => {
				this.notifySettingsChanged();
				return preset;
			});
	}

	public createQueryPreset(request: CreateDownloadSearchQueryPresetRequest): Promise<DownloadSearchQueryPreset> {
		return window.electronAPI.downloadSearch.createQueryPreset(request)
			.then((preset) => {
				this.notifySettingsChanged();
				return preset;
			});
	}

	public setQueryPresetEnabled(presetId: string, enabled: boolean): Promise<void> {
		return window.electronAPI.downloadSearch.setQueryPresetEnabled(
			presetId,
			enabled,
		)
			.then(() => {
				this.notifySettingsChanged();
			});
	}

	public deleteQueryPreset(presetId: string): Promise<void> {
		return window.electronAPI.downloadSearch.deleteQueryPreset(presetId)
			.then(() => {
				this.notifySettingsChanged();
			});
	}

	private notifySettingsChanged(): void {
		downloadSearchSettingsChanged$.next();
	}
}

export const DownloadSearchSettingsChangeService = new DownloadSearchSettingsChangeServiceImpl();
