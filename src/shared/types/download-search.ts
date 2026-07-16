import { MediaId } from "./nimlat-ids";

export type DownloadSearchProviderCategory = "torrent" | "index";

export type DownloadSearchKeywordCategory =
	| "quality"
	| "source"
	| "subtitles"
	| "audio"
	| "releaseGroup"
	| "origin"
	| "completion"
	| "format"
	| "custom";

export type DownloadSearchTitleLanguage = "english" | "romaji" | "native";

export type DownloadBrowserMode = "system" | "custom";

export interface DownloadSearchProvider {
	id: string;
	label: string;
	category: DownloadSearchProviderCategory;
	baseUrl: string;
	isBuiltIn: boolean;
	enabled: boolean;
	sortOrder: number;
}

export interface DownloadSearchKeywordPreset {
	id: string;
	label: string;
	value: string;
	category: DownloadSearchKeywordCategory;
	isBuiltIn: boolean;
	enabled: boolean;
}

export interface DownloadSearchBuilderState {
	titleLanguage: DownloadSearchTitleLanguage;
	selectedPresetIds: string[];
	customQueryText: string;
}

export interface DownloadSearchQueryPreset {
	id: string;
	label: string;
	selectedPresetIds: string[];
	customQueryText: string;
	enabled: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface DownloadBrowserConfig {
	mode: DownloadBrowserMode;
	executablePath?: string;
}

export interface DownloadSearchSettings {
	providers: DownloadSearchProvider[];
	keywordPresets: DownloadSearchKeywordPreset[];
	queryPresets: DownloadSearchQueryPreset[];
	builderState: DownloadSearchBuilderState;
	browserConfig: DownloadBrowserConfig;
}

export interface DownloadSearchMediaTitleOptions {
	english?: string;
	romaji?: string;
	native?: string;
}

export interface OpenDownloadSearchRequest {
	providerId: string;
	query: string;
	mediaId?: MediaId;
}

export interface OpenDownloadSearchResult {
	success: boolean;
	url?: string;
	error?: string;
}

export interface SaveDownloadSearchBuilderStateRequest extends DownloadSearchBuilderState {
	mediaId?: MediaId;
	lastUsedProviderId?: string;
}

export type SaveDownloadBrowserConfigRequest = DownloadBrowserConfig;

export interface CreateDownloadSearchKeywordPresetRequest {
	label: string;
	value: string;
	category: DownloadSearchKeywordCategory;
}

export interface CreateDownloadSearchProviderRequest {
	label: string;
	category: DownloadSearchProviderCategory;
	baseUrl: string;
}

export interface UpdateDownloadSearchProviderRequest extends CreateDownloadSearchProviderRequest {
	providerId: string;
}

export interface CreateDownloadSearchQueryPresetRequest {
	label: string;
	selectedPresetIds: string[];
	customQueryText: string;
}

export interface PickDownloadBrowserExecutableResult {
	success: boolean;
	canceled?: boolean;
	executablePath?: string;
	error?: string;
}
