import {
	DownloadSearchKeywordPreset,
	DownloadSearchProvider,
} from "../../types/download-search";

function normalizeQueryPart(value: string): string {
	return value.trim().replace(
		/\s+/g,
		" ",
	);
}

export function buildDownloadSearchQuery(
	title: string,
	presets: Pick<DownloadSearchKeywordPreset, "value">[],
	customQueryText: string = "",
): string {
	const seenParts = new Set<string>();
	return [
		title,
		...presets.map((preset) => preset.value),
		customQueryText,
	]
		.flatMap((part) => normalizeQueryPart(part).split(" "))
		.filter((part) => {
			if (part.length === 0) {
				return false;
			}
			const normalizedPart = part.toLowerCase();
			if (seenParts.has(normalizedPart)) {
				return false;
			}
			seenParts.add(normalizedPart);
			return true;
		})
		.join(" ");
}

export function buildDownloadSearchProviderUrl(provider: Pick<DownloadSearchProvider, "baseUrl">, query: string): string {
	const normalizedQuery = normalizeQueryPart(query);
	if (normalizedQuery.length === 0) {
		throw new Error("Download search query cannot be empty.");
	}

	const encodedQuery = encodeURIComponent(normalizedQuery);
	const url          = provider.baseUrl.includes("{query}")
		? provider.baseUrl.replace(
			"{query}",
			encodedQuery,
		)
		: `${ provider.baseUrl }${ encodedQuery }`;
	const parsed       = new URL(url);
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		throw new Error("Download search provider URL must use HTTP or HTTPS.");
	}

	return parsed.toString();
}
