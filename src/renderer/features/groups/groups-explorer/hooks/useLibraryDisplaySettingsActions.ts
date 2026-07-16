import type {
	LibraryAdultFilter,
	LibraryDisplayFilters,
	LibraryDisplayMode,
} from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";

interface UseLibraryDisplaySettingsActionsInput {
	commitDisplayMode: (nextMode: LibraryDisplayMode) => void;
	displayMode: LibraryDisplayMode;
	effectiveAdultFilter: LibraryAdultFilter;
	persistLibraryFilters: (nextFilters: LibraryDisplayFilters) => void;
	setAdultFilter: (nextFilter: LibraryAdultFilter) => void;
}

interface UseLibraryDisplaySettingsActionsResult {
	handleAdultFilterChange: (nextFilter: LibraryAdultFilter) => void;
	handleDisplayModeChange: (nextMode: LibraryDisplayMode) => void;
}

// User actions optimistically update local controls and persist the DB-backed
// filters. Metadata facets are reset because these controls change wall scope.
export function useLibraryDisplaySettingsActions({
																									 commitDisplayMode,
																									 displayMode,
																									 effectiveAdultFilter,
																									 persistLibraryFilters,
																									 setAdultFilter,
																								 }: UseLibraryDisplaySettingsActionsInput): UseLibraryDisplaySettingsActionsResult {
	const handleAdultFilterChange = useCallback(
		(nextFilter: LibraryAdultFilter) => {
			setAdultFilter(nextFilter);
			persistLibraryFilters({
				adultFilter: nextFilter,
				displayMode,
				genreNames:  [],
				tagNames:    [],
			});
		},
		[
			displayMode,
			persistLibraryFilters,
			setAdultFilter,
		],
	);

	const handleDisplayModeChange = useCallback(
		(nextMode: LibraryDisplayMode) => {
			commitDisplayMode(nextMode);
			persistLibraryFilters({
				adultFilter: effectiveAdultFilter,
				displayMode: nextMode,
				genreNames:  [],
				tagNames:    [],
			});
		},
		[
			commitDisplayMode,
			effectiveAdultFilter,
			persistLibraryFilters,
		],
	);

	return {
		handleAdultFilterChange,
		handleDisplayModeChange,
	};
}
