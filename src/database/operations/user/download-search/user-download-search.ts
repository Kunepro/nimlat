// Public compatibility barrel for download-search DB operations. The domain
// logic lives in focused read/write modules so this file stays an import target,
// not another facade with hidden behavior.
export {
	selectDownloadSearchSettings,
} from "./user-download-search-read";
export {
	saveDownloadBrowserConfig,
	saveDownloadSearchBuilderState,
} from "./user-download-search-state-write";
export {
	createDownloadSearchProvider,
	deleteDownloadSearchProvider,
	updateDownloadSearchProvider,
	updateDownloadSearchProviderEnabled,
} from "./user-download-search-provider-write";
export {
	createDownloadSearchKeywordPreset,
	createDownloadSearchQueryPreset,
	deleteDownloadSearchQueryPreset,
	updateDownloadSearchQueryPresetEnabled,
} from "./user-download-search-preset-write";
