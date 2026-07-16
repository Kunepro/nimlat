import type {
	DownloadBrowserConfig,
	DownloadSearchProvider,
	DownloadSearchProviderCategory,
} from "@nimlat/types/download-search";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";

export interface EditEpisodeModalState {
	isOpen: boolean;
	mediaId: number | null;
	episodeNumber: number | null;
	initialName: string;
	initialDescription: string;
}

export interface EditMediaModalState {
	isOpen: boolean;
	mediaId: number | null;
	initialName: string;
	initialDescription: string;
}

export interface EditGroupModalState {
	isOpen: boolean;
	group: GroupRef;
	initialName: string;
	initialDescription: string;
}

export interface DownloadProviderFormState {
	label: string;
	category: DownloadSearchProviderCategory;
	baseUrl: string;
}

export interface PreferencesModalState {
	isOpen: boolean;
	isAdultContentEnabled: boolean;
	backgroundStyle: BackgroundStyle;
	preferredTitleLanguage: PreferredTitleLanguage;
	isDevModeEnabled: boolean;
	isCanvasDiagnosticsEnabled: boolean;
	downloadBrowserConfig: DownloadBrowserConfig;
	downloadBrowserDraft: DownloadBrowserConfig;
	downloadBrowserCustomPath: string;
	downloadProviders: DownloadSearchProvider[];
	isAddingDownloadProvider: boolean;
	editingDownloadProviderId: string | null;
	newDownloadProvider: DownloadProviderFormState;
	editDownloadProvider: DownloadProviderFormState;
}
