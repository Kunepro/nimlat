import type {
	LibraryAdultFilter,
	LibraryDisplayFilters,
	LibraryDisplayMode,
	LibraryDisplayScope,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import { useMemo } from "react";
import { createLibraryDisplayState } from "../library-display-state-model";
import type { LibraryMetadataFilters } from "../library-metadata-filters";
import { useLibraryDisplaySettings } from "./useLibraryDisplaySettings";
import { useLibraryMetadataFilterState } from "./useLibraryMetadataFilterState";

interface UseLibraryDisplayStateInput {
	requestWallReload: () => void;
	scope: LibraryDisplayScope;
	search: string;
	wallResetKey: number;
}

interface UseLibraryDisplayStateResult {
	effectiveAdultFilter: LibraryAdultFilter;
	displayMode: LibraryDisplayMode;
	filterOptions: LibraryFilterOptions;
	isAdultContentEnabled: boolean;
	metadataFilters: LibraryMetadataFilters;
	libraryFilters: LibraryDisplayFilters;
	libraryDataKey: string;
	emptyDescription: string;
	isEmptyLibraryDownloadPromptVisible: boolean;
	handleAdultFilterChange: (nextFilter: LibraryAdultFilter) => void;
	handleDisplayModeChange: (nextMode: LibraryDisplayMode) => void;
	handleMetadataFiltersChange: (nextFilters: LibraryMetadataFilters) => void;
}

// Groups Explorer display state combines persisted display settings, URL metadata
// filters, and the derived wall read contract used by the media-wall data source.
export function useLibraryDisplayState({
																				 requestWallReload,
																				 scope,
																				 search,
																				 wallResetKey,
																			 }: UseLibraryDisplayStateInput): UseLibraryDisplayStateResult {
	const {
					displayMode,
					effectiveAdultFilter,
					filterOptions,
					isAdultContentEnabled,
					handleAdultFilterChange,
					handleDisplayModeChange,
				} = useLibraryDisplaySettings({ requestWallReload });
	const {
					metadataFilters,
					handleMetadataFiltersChange,
				} = useLibraryMetadataFilterState({ scope });
	const {
					emptyState,
					libraryDataKey,
					libraryFilters,
				} = useMemo(
		() => createLibraryDisplayState({
			scope,
			displayMode,
			effectiveAdultFilter,
			metadataFilters,
			search,
			wallResetKey,
		}),
		[
			displayMode,
			effectiveAdultFilter,
			metadataFilters,
			scope,
			search,
			wallResetKey,
		],
	);

	return {
		displayMode,
		effectiveAdultFilter,
		emptyDescription:                    emptyState.description,
		filterOptions,
		handleAdultFilterChange,
		handleDisplayModeChange,
		handleMetadataFiltersChange,
		isAdultContentEnabled,
		isEmptyLibraryDownloadPromptVisible: emptyState.showAnimeDbDownloadPrompt,
		libraryDataKey,
		libraryFilters,
		metadataFilters,
	};
}
