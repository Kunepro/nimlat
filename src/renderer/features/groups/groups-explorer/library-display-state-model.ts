import type {
	LibraryAdultFilter,
	LibraryDisplayFilters,
	LibraryDisplayMode,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import type { LibraryMetadataFilters } from "./library-metadata-filters";

interface CreateLibraryDisplayFiltersInput {
	displayMode: LibraryDisplayMode;
	effectiveAdultFilter: LibraryAdultFilter;
	metadataFilters: LibraryMetadataFilters;
}

interface CreateLibraryDataKeyInput extends CreateLibraryDisplayFiltersInput {
	scope: LibraryDisplayScope;
	wallResetKey: number;
}

interface CreateLibraryDisplayStateInput extends CreateLibraryDataKeyInput {
	search: string;
}

interface LibraryEmptyStateInput {
	hasActiveFilters: boolean;
	isIgnoredScope: boolean;
	search: string;
}

interface LibraryEmptyState {
	description: string;
	showAnimeDbDownloadPrompt: boolean;
}

interface LibraryDisplayState {
	emptyState: LibraryEmptyState;
	hasActiveFilters: boolean;
	libraryDataKey: string;
	libraryFilters: LibraryDisplayFilters;
}

export function createLibraryMetadataFiltersKey(metadataFilters: LibraryMetadataFilters): string {
	return JSON.stringify([
		metadataFilters.genreNames,
		metadataFilters.tagNames,
	]);
}

export function createLibraryDisplayFilters({
																							displayMode,
																							effectiveAdultFilter,
																							metadataFilters,
																						}: CreateLibraryDisplayFiltersInput): LibraryDisplayFilters {
	return {
		adultFilter: effectiveAdultFilter,
		displayMode,
		genreNames:  metadataFilters.genreNames,
		tagNames:    metadataFilters.tagNames,
	};
}

export function hasActiveLibraryFilters({
																					displayMode,
																					effectiveAdultFilter,
																					metadataFilters,
																				}: CreateLibraryDisplayFiltersInput): boolean {
	return effectiveAdultFilter !== "mixed"
		|| displayMode !== "groups"
		|| metadataFilters.genreNames.length > 0
		|| metadataFilters.tagNames.length > 0;
}

export function createLibraryDataKey({
																			 scope,
																			 displayMode,
																			 effectiveAdultFilter,
																			 metadataFilters,
																			 wallResetKey,
																		 }: CreateLibraryDataKeyInput): string {
	return `${ scope }:${ displayMode }:${ effectiveAdultFilter }:${ createLibraryMetadataFiltersKey(metadataFilters) }:${ wallResetKey }`;
}

export function createLibraryDisplayState({
																						scope,
																						displayMode,
																						effectiveAdultFilter,
																						metadataFilters,
																						search,
																						wallResetKey,
																					}: CreateLibraryDisplayStateInput): LibraryDisplayState {
	const hasActiveFilters = hasActiveLibraryFilters({
		displayMode,
		effectiveAdultFilter,
		metadataFilters,
	});

	return {
		emptyState:     getLibraryEmptyState({
			hasActiveFilters,
			isIgnoredScope: scope === "ignored",
			search,
		}),
		hasActiveFilters,
		libraryDataKey: createLibraryDataKey({
			scope,
			displayMode,
			effectiveAdultFilter,
			metadataFilters,
			wallResetKey,
		}),
		libraryFilters: createLibraryDisplayFilters({
			displayMode,
			effectiveAdultFilter,
			metadataFilters,
		}),
	};
}

export function getLibraryEmptyState({
																			 hasActiveFilters,
																			 isIgnoredScope,
																			 search,
																		 }: LibraryEmptyStateInput): LibraryEmptyState {
	const hasSearch = search.length > 0;
	if (hasSearch || hasActiveFilters) {
		return {
			description:               `No matching ${ isIgnoredScope ? "ignored" : "library" } items.`,
			showAnimeDbDownloadPrompt: false,
		};
	}

	if (isIgnoredScope) {
		return {
			description:               "No ignored content.",
			showAnimeDbDownloadPrompt: false,
		};
	}

	return {
		description:               "Library is empty.",
		showAnimeDbDownloadPrompt: true,
	};
}
