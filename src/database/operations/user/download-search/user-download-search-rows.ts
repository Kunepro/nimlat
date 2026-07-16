import type {
	DownloadBrowserConfig,
	DownloadSearchBuilderState,
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
	DownloadSearchTitleLanguage,
} from "@nimlat/types/download-search";

export type DownloadProviderRow = Omit<DownloadSearchProvider, "isBuiltIn" | "enabled"> & {
	isBuiltIn: number;
	enabled: number;
};

export type DownloadKeywordPresetRow = Omit<DownloadSearchKeywordPreset, "isBuiltIn" | "enabled"> & {
	isBuiltIn: number;
	enabled: number;
};

export type DownloadBuilderStateRow = {
	titleLanguage: DownloadSearchTitleLanguage;
	selectedPresetIdsJson: string;
	customQueryText: string;
};

export type DownloadQueryPresetRow = Omit<DownloadSearchQueryPreset, "selectedPresetIds" | "enabled"> & {
	selectedPresetIdsJson: string;
	enabled: number;
};

export type DownloadBrowserConfigRow = {
	mode: DownloadBrowserConfig["mode"];
	executablePath: string | null;
};

export type MaxSortOrderRow = {
	maxSortOrder: number | null;
};

export function mapDownloadProvider(row: DownloadProviderRow): DownloadSearchProvider {
	return {
		...row,
		isBuiltIn: row.isBuiltIn === 1,
		enabled:   row.enabled === 1,
	};
}

export function mapDownloadKeywordPreset(row: DownloadKeywordPresetRow): DownloadSearchKeywordPreset {
	return {
		...row,
		isBuiltIn: row.isBuiltIn === 1,
		enabled:   row.enabled === 1,
	};
}

function parseSelectedDownloadPresetIds(value: string): string[] {
	try {
		const parsed = JSON.parse(value) as unknown;
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		// Corrupt user draft JSON must not break settings reads; callers receive a clean empty selection.
		return [];
	}
}

export function mapDownloadBuilderState(row: DownloadBuilderStateRow | undefined): DownloadSearchBuilderState {
	return {
		titleLanguage:     row?.titleLanguage ?? "english",
		selectedPresetIds: parseSelectedDownloadPresetIds(row?.selectedPresetIdsJson ?? "[]"),
		customQueryText:   row?.customQueryText ?? "",
	};
}

export function mapDownloadQueryPreset(row: DownloadQueryPresetRow): DownloadSearchQueryPreset {
	return {
		id:                row.id,
		label:             row.label,
		selectedPresetIds: parseSelectedDownloadPresetIds(row.selectedPresetIdsJson),
		customQueryText:   row.customQueryText,
		enabled:           row.enabled === 1,
		createdAt:         row.createdAt,
		updatedAt:         row.updatedAt,
	};
}

export function mapDownloadBrowserConfig(row: DownloadBrowserConfigRow | undefined): DownloadBrowserConfig {
	return {
		mode:           row?.mode ?? "system",
		executablePath: row?.executablePath || undefined,
	};
}
