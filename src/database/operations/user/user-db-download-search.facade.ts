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
	createDownloadSearchKeywordPreset,
	createDownloadSearchProvider,
	createDownloadSearchQueryPreset,
	deleteDownloadSearchProvider,
	deleteDownloadSearchQueryPreset,
	saveDownloadBrowserConfig,
	saveDownloadSearchBuilderState,
	selectDownloadSearchSettings,
	updateDownloadSearchProvider,
	updateDownloadSearchProviderEnabled,
	updateDownloadSearchQueryPresetEnabled,
} from "./download-search/user-download-search";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Local download-search preferences live in user_data. Provider network checks
// stay in main services; this panel only exposes persisted settings mutations.
export const UserDbDownloadSearchFacade = {
	// Read the full local download-search settings payload.
	getSettings: (): DownloadSearchSettings => {
		return runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.getSettings",
			() => selectDownloadSearchSettings(),
		);
	},

	// Persist the reusable builder state without caching provider search results.
	saveBuilderState: (request: SaveDownloadSearchBuilderStateRequest): void => {
		runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.saveBuilderState",
			() => saveDownloadSearchBuilderState(request),
			{ mediaId: request.mediaId },
		);
	},

	saveBrowserConfig: (config: DownloadBrowserConfig): void => {
		runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.saveBrowserConfig",
			() => saveDownloadBrowserConfig(config),
			{ mode: config.mode },
		);
	},

	setProviderEnabled: (providerId: string, enabled: boolean): void => {
		runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.setProviderEnabled",
			() => updateDownloadSearchProviderEnabled(
				providerId,
				enabled,
			),
			{ providerId },
		);
	},

	createProvider: (request: CreateDownloadSearchProviderRequest): DownloadSearchProvider => {
		return runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.createProvider",
			() => createDownloadSearchProvider(request),
			{ category: request.category },
		);
	},

	updateProvider: (request: UpdateDownloadSearchProviderRequest): DownloadSearchProvider => {
		return runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.updateProvider",
			() => updateDownloadSearchProvider(request),
			{ providerId: request.providerId },
		);
	},

	deleteProvider: (providerId: string): void => {
		runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.deleteProvider",
			() => deleteDownloadSearchProvider(providerId),
			{ providerId },
		);
	},

	createKeywordPreset: (request: CreateDownloadSearchKeywordPresetRequest): DownloadSearchKeywordPreset => {
		return runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.createKeywordPreset",
			() => createDownloadSearchKeywordPreset(request),
			{ category: request.category },
		);
	},

	createQueryPreset: (request: CreateDownloadSearchQueryPresetRequest): DownloadSearchQueryPreset => {
		return runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.createQueryPreset",
			() => createDownloadSearchQueryPreset(request),
		);
	},

	setQueryPresetEnabled: (presetId: string, enabled: boolean): void => {
		runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.setQueryPresetEnabled",
			() => updateDownloadSearchQueryPresetEnabled(
				presetId,
				enabled,
			),
			{ presetId },
		);
	},

	deleteQueryPreset: (presetId: string): void => {
		runUserDbFacadeOperation(
			"user-db.facade.downloadSearch.deleteQueryPreset",
			() => deleteDownloadSearchQueryPreset(presetId),
			{ presetId },
		);
	},
} as const;
