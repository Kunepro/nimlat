import { LibraryDisplayFilters } from "@nimlat/types/ipc-payloads";

export type LibraryMetadataFilters = Pick<LibraryDisplayFilters, "genreNames" | "tagNames">;

type LibraryRouteSearch = {
	genreNames?: unknown;
	tagNames?: unknown;
};

export function normalizeRouteFilterValues(value: unknown): string[] {
	const values          = Array.isArray(value)
		? value
		: typeof value === "string"
			? [ value ]
			: [];
	const seen            = new Set<string>();
	const names: string[] = [];

	for (const candidate of values) {
		if (typeof candidate !== "string") {
			continue;
		}
		const name = candidate.trim();
		const key  = name.toLocaleLowerCase();
		if (!name || seen.has(key)) {
			continue;
		}
		seen.add(key);
		names.push(name);
	}

	return names;
}

export function parseLibraryMetadataFilters(search: unknown): LibraryMetadataFilters {
	const routeSearch = search as LibraryRouteSearch;

	return {
		genreNames: normalizeRouteFilterValues(routeSearch.genreNames),
		tagNames:   normalizeRouteFilterValues(routeSearch.tagNames),
	};
}

export function serializeLibraryMetadataFilterSearch(filters: LibraryMetadataFilters): LibraryRouteSearch {
	return {
		genreNames: filters.genreNames.length > 0 ? filters.genreNames : undefined,
		tagNames:   filters.tagNames.length > 0 ? filters.tagNames : undefined,
	};
}
