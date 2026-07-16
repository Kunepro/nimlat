import type {
	LibraryAdultFilter,
	LibraryDisplayFilters,
	LibraryDisplayMode,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";

export const EMPTY_LIBRARY_FILTER_OPTIONS: LibraryFilterOptions = {
	genreNames: [],
	tagNames:   [],
};

interface LibraryDisplaySettingsSnapshot {
	adultFilter: LibraryAdultFilter;
	displayMode: LibraryDisplayMode;
	filterOptions: LibraryFilterOptions;
	isAdultContentEnabled: boolean;
}

export interface ResolvedLibraryDisplaySettingsLoad {
	filtersToPersist: LibraryDisplayFilters | null;
	settings: LibraryDisplaySettingsSnapshot;
}

export interface ResolvedLibraryAdultContentStatusChange {
	adultFilter: LibraryAdultFilter | null;
	filtersToPersist: LibraryDisplayFilters | null;
	isAdultContentEnabled: boolean;
}

export function createPersistedLibraryDisplayFilters(
	adultFilter: LibraryAdultFilter,
	displayMode: LibraryDisplayMode,
): LibraryDisplayFilters {
	return {
		adultFilter,
		displayMode,
		genreNames: [],
		tagNames:   [],
	};
}

export function removeAdultOnlyLibraryFilters(filters: LibraryDisplayFilters): LibraryDisplayFilters {
	// Adult-off mode must not keep hidden adult/metadata filters persisted, otherwise the wall can reopen empty.
	return {
		...filters,
		adultFilter: "mixed",
		genreNames:  [],
		tagNames:    [],
	};
}

export function shouldPersistAdultFilterReset(filters: LibraryDisplayFilters): boolean {
	return filters.adultFilter !== "mixed"
		|| filters.genreNames.length > 0
		|| filters.tagNames.length > 0;
}

export function formatLibraryDisplaySettingsError(
	error: unknown,
	fallbackMessage: string,
): string {
	return error instanceof Error && error.message.trim().length > 0
		? error.message
		: fallbackMessage;
}

export function resolveLibraryDisplaySettingsLoad({
																										adultContentEnabled,
																										filters,
																										filterOptions,
																									}: {
	adultContentEnabled: boolean;
	filters: LibraryDisplayFilters;
	filterOptions: LibraryFilterOptions;
}): ResolvedLibraryDisplaySettingsLoad {
	return {
		filtersToPersist: !adultContentEnabled && shouldPersistAdultFilterReset(filters)
												? removeAdultOnlyLibraryFilters(filters)
												: null,
		settings:         {
			adultFilter:           adultContentEnabled ? filters.adultFilter : "mixed",
			displayMode:           filters.displayMode,
			filterOptions,
			isAdultContentEnabled: adultContentEnabled,
		},
	};
}

export function resolveLibraryAdultContentStatusChange(
	enabled: boolean,
	currentDisplayMode: LibraryDisplayMode,
): ResolvedLibraryAdultContentStatusChange {
	if (enabled) {
		return {
			adultFilter:           null,
			filtersToPersist:      null,
			isAdultContentEnabled: true,
		};
	}

	// Disabling adult content must clear hidden adult-only filters immediately,
	// otherwise the next wall read can look empty while the UI shows "mixed".
	return {
		adultFilter:           "mixed",
		filtersToPersist:      createPersistedLibraryDisplayFilters(
			"mixed",
			currentDisplayMode,
		),
		isAdultContentEnabled: false,
	};
}
