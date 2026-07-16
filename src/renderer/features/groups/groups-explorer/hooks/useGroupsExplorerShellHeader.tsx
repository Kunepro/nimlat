import type {
	LibraryAdultFilter,
	LibraryDisplayMode,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import { useMemo } from "react";
import { useGroupsShellHeader } from "../../groups-shell/use-groups-shell-header";
import {
	getLibraryShellHeaderTitle,
	getLibraryShellNavigationIcon,
} from "../library-header-actions-model";
import type { LibraryMetadataFilters } from "../library-metadata-filters";
import LibraryHeaderActions from "../LibraryHeaderActions";

export interface UseGroupsExplorerShellHeaderOptions {
	adultFilter: LibraryAdultFilter;
	displayMode: LibraryDisplayMode;
	filterOptions: LibraryFilterOptions;
	isAdultContentEnabled: boolean;
	isIgnoredScope: boolean;
	isIgnoringSelected: boolean;
	metadataFilters: LibraryMetadataFilters;
	selectedCount: number;
	onAdultFilterChange: (filter: LibraryAdultFilter) => void;
	onDisplayModeChange: (mode: LibraryDisplayMode) => void;
	onHeaderSearchChange: (nextSearch: string) => void;
	onIgnoreSelectedItems: () => Promise<void>;
	onMetadataFiltersChange: (filters: LibraryMetadataFilters) => void;
	onOpenAddToModal: () => void;
	onShellBack: () => void;
}

// Library pages configure the groups shell header, but the page body should
// remain focused on data composition. This hook keeps header controls stable
// and prevents search/filter JSX from creeping back into the route component.
export function useGroupsExplorerShellHeader({
																							 adultFilter,
																							 displayMode,
																							 filterOptions,
																							 isAdultContentEnabled,
																							 isIgnoredScope,
																							 isIgnoringSelected,
																							 metadataFilters,
																							 selectedCount,
																							 onAdultFilterChange,
																							 onDisplayModeChange,
																							 onHeaderSearchChange,
																							 onIgnoreSelectedItems,
																							 onMetadataFiltersChange,
																							 onOpenAddToModal,
																							 onShellBack,
																						 }: UseGroupsExplorerShellHeaderOptions): void {
	const rightContent = useMemo(
		() => (
			<LibraryHeaderActions
				adultFilter={ adultFilter }
				displayMode={ displayMode }
				filterOptions={ filterOptions }
				genreNames={ metadataFilters.genreNames }
				isAdultContentEnabled={ isAdultContentEnabled }
				isIgnoredScope={ isIgnoredScope }
				isIgnoringSelected={ isIgnoringSelected }
				selectedCount={ selectedCount }
				tagNames={ metadataFilters.tagNames }
				onAdultFilterChange={ onAdultFilterChange }
				onDisplayModeChange={ onDisplayModeChange }
				onIgnoreSelected={ onIgnoreSelectedItems }
				onMetadataFiltersChange={ onMetadataFiltersChange }
				onOpenAddTo={ onOpenAddToModal }
				onSearchChange={ onHeaderSearchChange }
			/>
		),
		[
			adultFilter,
			displayMode,
			filterOptions,
			isAdultContentEnabled,
			isIgnoredScope,
			isIgnoringSelected,
			metadataFilters.genreNames,
			metadataFilters.tagNames,
			onAdultFilterChange,
			onDisplayModeChange,
			onHeaderSearchChange,
			onIgnoreSelectedItems,
			onMetadataFiltersChange,
			onOpenAddToModal,
			selectedCount,
		],
	);

	useGroupsShellHeader({
		title:          getLibraryShellHeaderTitle(isIgnoredScope),
		onBack:         onShellBack,
		isBackEnabled:  isIgnoredScope,
		navigationIcon: getLibraryShellNavigationIcon(isIgnoredScope),
		rightContent,
	});
}
