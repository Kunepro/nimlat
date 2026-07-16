import type {
	DownloadSearchBuilderState,
	DownloadSearchKeywordCategory,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
	DownloadSearchTitleLanguage,
} from "@nimlat/types/download-search";
import type { MediaDownloadInspection } from "../../../types/media-download";

export interface MediaDownloadExplorerState {
	actionError: string | null;
	activeQueryPresets: DownloadSearchQueryPreset[];
	builderState: DownloadSearchBuilderState;
	currentQueryPreview: string;
	enabledProviders: DownloadSearchProvider[];
	errorMessage: string | null;
	isLoading: boolean;
	isSettingDownloading: boolean;
	media: MediaDownloadInspection;
	numericMediaId: number;
	presetLabelDraft: string;
	presets: DownloadSearchKeywordPreset[];
	queryPresets: DownloadSearchQueryPreset[];
	title: string;
	titleDraft: string;
	createQueryPreset: () => Promise<void>;
	deleteQueryPreset: (presetId: string) => Promise<void>;
	openProviderPresets: (provider: DownloadSearchProvider, targetPresets: DownloadSearchQueryPreset[]) => Promise<void>;
	replaceAudioCodec: (nextPresetId: string | undefined) => void;
	replaceCategoryPreset: (category: DownloadSearchKeywordCategory, nextPresetId: string | undefined) => void;
	setCustomQueryText: (value: string) => void;
	setMediaDownloading: () => Promise<void>;
	setPresetLabelDraft: (value: string) => void;
	setTitleDraft: (value: string) => void;
	setTitleLanguage: (titleLanguage: DownloadSearchTitleLanguage) => void;
	toggleAudioFlag: (value: string, enabled: boolean) => void;
	toggleQueryPreset: (presetId: string, enabled: boolean) => void;
}

export type MediaDownloadExplorerReadyState = Omit<MediaDownloadExplorerState, "media"> & {
	media: NonNullable<MediaDownloadExplorerState["media"]>;
};
