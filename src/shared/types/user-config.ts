export type BackgroundStyle = "synthwave" | "kanaMatrix" | "kanaGrid" | "staticDarkBlue";
export type LibraryAdultFilter = "mixed" | "adult" | "nonAdult";
export type LibraryDisplayMode = "groups" | "rawMedia";
export type PreferredTitleLanguage = "english" | "romaji" | "native";

export interface LibraryDisplayFilters {
	adultFilter: LibraryAdultFilter;
	displayMode: LibraryDisplayMode;
	genreNames: string[];
	tagNames: string[];
}

export const DEFAULT_BACKGROUND_STYLE: BackgroundStyle              = "kanaMatrix";
export const DEFAULT_PREFERRED_TITLE_LANGUAGE: PreferredTitleLanguage = "english";
export const DEFAULT_LIBRARY_DISPLAY_FILTERS: LibraryDisplayFilters = {
	adultFilter: "mixed",
	displayMode: "groups",
	genreNames:  [],
	tagNames:    [],
};

export function isBackgroundStyle(value: unknown): value is BackgroundStyle {
	return value === "synthwave" || value === "kanaMatrix" || value === "kanaGrid" || value === "staticDarkBlue";
}

export function isPreferredTitleLanguage(value: unknown): value is PreferredTitleLanguage {
	return value === "english" || value === "romaji" || value === "native";
}

export function isLibraryAdultFilter(value: unknown): value is LibraryAdultFilter {
	return value === "mixed" || value === "adult" || value === "nonAdult";
}

export function isLibraryDisplayMode(value: unknown): value is LibraryDisplayMode {
	return value === "groups" || value === "rawMedia";
}
