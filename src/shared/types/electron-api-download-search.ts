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
} from "./download-search";

// Thin preload contract for download-search settings and provider launch actions.
// Query construction stays outside this type layer.
export interface DownloadSearchElectronApi {
	getSettings(): Promise<DownloadSearchSettings>;

	saveBuilderState(request: SaveDownloadSearchBuilderStateRequest): Promise<void>;

	saveBrowserConfig(config: DownloadBrowserConfig): Promise<void>;

	setProviderEnabled(providerId: string, enabled: boolean): Promise<void>;

	createProvider(request: CreateDownloadSearchProviderRequest): Promise<DownloadSearchProvider>;

	updateProvider(request: UpdateDownloadSearchProviderRequest): Promise<DownloadSearchProvider>;

	deleteProvider(providerId: string): Promise<void>;

	createKeywordPreset(request: CreateDownloadSearchKeywordPresetRequest): Promise<DownloadSearchKeywordPreset>;

	createQueryPreset(request: CreateDownloadSearchQueryPresetRequest): Promise<DownloadSearchQueryPreset>;

	setQueryPresetEnabled(presetId: string, enabled: boolean): Promise<void>;

	deleteQueryPreset(presetId: string): Promise<void>;

	openProviderSearch(request: OpenDownloadSearchRequest): Promise<OpenDownloadSearchResult>;

	pickBrowserExecutable(): Promise<PickDownloadBrowserExecutableResult>;
}
