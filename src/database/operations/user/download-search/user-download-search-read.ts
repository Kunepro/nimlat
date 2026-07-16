import type { DownloadSearchSettings } from "@nimlat/types/download-search";
import { getDatabase } from "../../../utils/get-db";
import {
	type DownloadBrowserConfigRow,
	type DownloadBuilderStateRow,
	type DownloadKeywordPresetRow,
	type DownloadProviderRow,
	type DownloadQueryPresetRow,
	mapDownloadBrowserConfig,
	mapDownloadBuilderState,
	mapDownloadKeywordPreset,
	mapDownloadProvider,
	mapDownloadQueryPreset,
} from "./user-download-search-rows";

export function selectDownloadSearchSettings(): DownloadSearchSettings {
	const db             = getDatabase();
	const providers      = db
		.prepare(`
			SELECT id, label, category, baseUrl, isBuiltIn, enabled, sortOrder
			FROM userDownloadSearchProviders
			-- Provider order is persisted separately from editable labels/categories
			-- so future drag/drop changes can update order without changing content.
			ORDER BY sortOrder ASC, rowid ASC
		`)
		.all() as DownloadProviderRow[];
	const keywordPresets = db
		.prepare("SELECT id, label, value, category, isBuiltIn, enabled FROM userDownloadSearchKeywordPresets ORDER BY category ASC, label ASC")
		.all() as DownloadKeywordPresetRow[];
	const builderState   = db
		.prepare("SELECT titleLanguage, selectedPresetIdsJson, customQueryText FROM userDownloadSearchBuilderState WHERE id = 1")
		.get() as DownloadBuilderStateRow | undefined;
	const queryPresets   = db
		.prepare("SELECT id, label, selectedPresetIdsJson, customQueryText, enabled, createdAt, updatedAt FROM userDownloadSearchQueryPresets ORDER BY createdAt ASC, label ASC")
		.all() as DownloadQueryPresetRow[];
	const browserConfig  = db
		.prepare("SELECT mode, executablePath FROM userDownloadBrowserConfig WHERE id = 1")
		.get() as DownloadBrowserConfigRow | undefined;

	return {
		providers:      providers.map(mapDownloadProvider),
		keywordPresets: keywordPresets.map(mapDownloadKeywordPreset),
		queryPresets:   queryPresets.map(mapDownloadQueryPreset),
		builderState:   mapDownloadBuilderState(builderState),
		browserConfig:  mapDownloadBrowserConfig(browserConfig),
	};
}
