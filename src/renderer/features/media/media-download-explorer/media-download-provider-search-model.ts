import type {
	DownloadSearchKeywordPreset,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import { buildDownloadSearchPresetQuery } from "./media-download-explorer.utils";

export interface DownloadSearchProviderPresetSearchPlan {
	errorMessage: string | null;
	queries: string[];
}

export function createDownloadSearchProviderOpenRequest(
	providerId: string,
	query: string,
	mediaId: number,
) {
	return {
		providerId,
		query,
		mediaId,
	};
}

function buildDownloadSearchProviderPresetQueries(
	title: string,
	presets: DownloadSearchKeywordPreset[],
	targetPresets: DownloadSearchQueryPreset[],
): string[] {
	return targetPresets.map((preset) => buildDownloadSearchPresetQuery(
		title,
		presets,
		preset,
	));
}

function getUniqueDownloadSearchQueries(queries: string[]): string[] {
	return Array.from(new Set(queries));
}

export function createDownloadSearchProviderPresetSearchPlan(
	title: string,
	presets: DownloadSearchKeywordPreset[],
	targetPresets: DownloadSearchQueryPreset[],
): DownloadSearchProviderPresetSearchPlan {
	const queries = getUniqueDownloadSearchQueries(
		buildDownloadSearchProviderPresetQueries(
			title,
			presets,
			targetPresets,
		).filter((query) => query.trim().length > 0),
	);

	return queries.length > 0
		? {
			errorMessage: null,
			queries,
		}
		: {
			errorMessage: "Create or enable at least one download search preset before opening links.",
			queries:      [],
		};
}
