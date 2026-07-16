import type {
	LibraryAdultFilter,
	LibraryDisplayMode,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import { useLibraryDisplaySettingsActions } from "./useLibraryDisplaySettingsActions";
import { useLibraryDisplaySettingsFeed } from "./useLibraryDisplaySettingsFeed";
import { useLibraryDisplaySettingsPersistence } from "./useLibraryDisplaySettingsPersistence";
import { useLibraryDisplaySettingsState } from "./useLibraryDisplaySettingsState";

interface UseLibraryDisplaySettingsInput {
	requestWallReload: () => void;
}

interface UseLibraryDisplaySettingsResult {
	adultFilter: LibraryAdultFilter;
	displayMode: LibraryDisplayMode;
	effectiveAdultFilter: LibraryAdultFilter;
	filterOptions: LibraryFilterOptions;
	isAdultContentEnabled: boolean;
	handleAdultFilterChange: (nextFilter: LibraryAdultFilter) => void;
	handleDisplayModeChange: (nextMode: LibraryDisplayMode) => void;
}

export function useLibraryDisplaySettings({
																						requestWallReload,
																					}: UseLibraryDisplaySettingsInput): UseLibraryDisplaySettingsResult {
	const state = useLibraryDisplaySettingsState();
	const {
					notifyLibraryDisplaySettingsError,
					persistLibraryFilters,
				}     = useLibraryDisplaySettingsPersistence();
	const {
					handleAdultFilterChange,
					handleDisplayModeChange,
				}     = useLibraryDisplaySettingsActions({
		commitDisplayMode:    state.commitDisplayMode,
		displayMode:          state.displayMode,
		effectiveAdultFilter: state.effectiveAdultFilter,
		persistLibraryFilters,
		setAdultFilter:       state.setAdultFilter,
	});

	useLibraryDisplaySettingsFeed({
		commitDisplayMode:      state.commitDisplayMode,
		displayModeRef:         state.displayModeRef,
		notifyLibraryDisplaySettingsError,
		persistLibraryFilters,
		requestWallReload,
		setAdultContentEnabled: state.setAdultContentEnabled,
		setAdultFilter:         state.setAdultFilter,
		setFilterOptions:       state.setFilterOptions,
	});

	return {
		adultFilter:           state.adultFilter,
		displayMode:           state.displayMode,
		effectiveAdultFilter:  state.effectiveAdultFilter,
		filterOptions:         state.filterOptions,
		isAdultContentEnabled: state.isAdultContentEnabled,
		handleAdultFilterChange,
		handleDisplayModeChange,
	};
}
