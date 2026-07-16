import type {
	LibraryDisplayItem,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useState,
} from "react";
import type { AddToGroupModalProps } from "../AddToGroupModal";
import { getLibraryGridOverlayState } from "../library-grid-model";
import type { LibraryGridSectionProps } from "../LibraryGridSection";
import { useAddToGroupModalState } from "./useAddToGroupModalState";
import type { UseGroupsExplorerShellHeaderOptions } from "./useGroupsExplorerShellHeader";
import { useLibraryDisplayState } from "./useLibraryDisplayState";
import { useLibraryItemActions } from "./useLibraryItemActions";
import { useLibraryNavigation } from "./useLibraryNavigation";
import { useLibrarySelectionState } from "./useLibrarySelectionState";
import { useLibraryViewReset } from "./useLibraryViewReset";
import { useLibraryWallInvalidationSubscriptions } from "./useLibraryWallInvalidationSubscriptions";
import { useLibraryWallState } from "./useLibraryWallState";

interface UseGroupsExplorerControllerInput {
	scope: LibraryDisplayScope;
}

interface UseGroupsExplorerControllerResult {
	shellHeader: UseGroupsExplorerShellHeaderOptions;
	gridSection: LibraryGridSectionProps;
	addToGroupModal: AddToGroupModalProps;
}

export function useGroupsExplorerController({
																							scope,
																						}: UseGroupsExplorerControllerInput): UseGroupsExplorerControllerResult {
	const isIgnoredScope        = scope === "ignored";
	const [ search, setSearch ] = useState("");
	const {
					selectedItems,
					selectedCount,
					selectedKeySet,
					clearSelection,
					removeSelectedKeys,
					toggleSelectedItem,
					updateSelectedItem,
				}                     = useLibrarySelectionState();
	const {
					hasLoadedInitialRange,
					totalItems,
					errorMessage,
					wallReloadKey,
					wallResetKey,
					handleRangeLoaded,
					handleRangeLoadError,
					onVisibleItemsRemoved,
					requestBackgroundWallReload,
					requestWallReload,
					resetVisibleRange,
				}                     = useLibraryWallState();
	const {
					libraryDataKey,
					libraryFilters,
					displayMode,
					emptyDescription,
					effectiveAdultFilter,
					filterOptions,
					handleAdultFilterChange,
					handleDisplayModeChange,
					handleMetadataFiltersChange,
					isAdultContentEnabled,
					isEmptyLibraryDownloadPromptVisible,
					metadataFilters,
				}                     = useLibraryDisplayState({
		requestWallReload,
		scope,
		search,
		wallResetKey,
	});
	const {
					onShellBack,
					handleOpenItem,
					openAnimeDbDownload,
				}                     = useLibraryNavigation({ scope });

	const {
					isIgnoringSelected,
					updatingStatusKeySet,
					watchStateOverrides,
					deletingKeySet,
					refreshingKeySet,
					handleEditItem,
					handleDeleteGroup,
					handleRefreshItem,
					handleIntegrationStatusChange,
					handleWatchStateChange,
					handleIgnoreSelectedItems,
				} = useLibraryItemActions({
		isIgnoredScope,
		selectedItems,
		onVisibleItemsRemoved,
		removeSelectedKeys,
		requestWallReload,
		updateSelectedItem,
	});

	const handleHeaderSearchChange = useCallback(
		(nextSearch: string) => {
			setSearch(nextSearch);
		},
		[],
	);

	const handleToggleSelected = useCallback(
		(item: LibraryDisplayItem) => {
			toggleSelectedItem(item);
		},
		[ toggleSelectedItem ],
	);
	const handleRetryLoad      = useCallback(
		() => {
			requestWallReload(true);
		},
		[ requestWallReload ],
	);

	const {
					closeAddToModal,
					handleAddToCompleted,
					handleOpenAddToModal,
					isAddToModalOpen,
				} = useAddToGroupModalState({
		clearSelection,
		requestWallReload,
	});
	useLibraryViewReset({
		clearSelection,
		displayMode,
		effectiveAdultFilter,
		resetVisibleRange,
		scope,
		search,
	});
	useLibraryWallInvalidationSubscriptions({
		requestBackgroundWallReload,
		requestWallReload,
	});
	const overlayState = getLibraryGridOverlayState({
		emptyDescription,
		errorMessage,
		hasLoadedInitialRange,
		isEmptyLibraryDownloadPromptVisible,
		totalItems,
	});

	// Return prop groups by UI consumer so the page remains a composition layer
	// instead of re-knowing every detail owned by the controller.
	return {
		shellHeader:     {
			adultFilter:             effectiveAdultFilter,
			displayMode,
			filterOptions,
			isAdultContentEnabled,
			isIgnoredScope,
			isIgnoringSelected,
			metadataFilters,
			selectedCount,
			onAdultFilterChange:     handleAdultFilterChange,
			onDisplayModeChange:     handleDisplayModeChange,
			onHeaderSearchChange:    handleHeaderSearchChange,
			onIgnoreSelectedItems:   handleIgnoreSelectedItems,
			onMetadataFiltersChange: handleMetadataFiltersChange,
			onOpenAddToModal:        handleOpenAddToModal,
			onShellBack,
		},
		gridSection:     {
			scope,
			search,
			filters:                   libraryFilters,
			dataKey:                   libraryDataKey,
			reloadKey:                 wallReloadKey,
			selectedKeys:              selectedKeySet,
			updatingStatusKeys:        updatingStatusKeySet,
			watchStateOverrides,
			deletingKeys:              deletingKeySet,
			refreshingKeys:            refreshingKeySet,
			overlayState,
			onRangeLoaded:             handleRangeLoaded,
			onRangeLoadError:          handleRangeLoadError,
			onOpenItem:                handleOpenItem,
			onToggleSelected:          handleToggleSelected,
			onEditItem:                handleEditItem,
			onDeleteGroup:             handleDeleteGroup,
			onRefreshItem:             handleRefreshItem,
			onIntegrationStatusChange: handleIntegrationStatusChange,
			onWatchStateChange:        handleWatchStateChange,
			onDownloadAnimeDb:         openAnimeDbDownload,
			onRetryLoad:               handleRetryLoad,
		},
		addToGroupModal: {
			isOpen:      isAddToModalOpen,
			selectedItems,
			onClose:     closeAddToModal,
			onCompleted: handleAddToCompleted,
		},
	};
}
