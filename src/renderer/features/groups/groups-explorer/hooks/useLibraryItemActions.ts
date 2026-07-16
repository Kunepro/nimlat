import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import { useLibraryItemEditAction } from "./useLibraryItemEditAction";
import { useLibraryItemIntegrationActions } from "./useLibraryItemIntegrationActions";
import { useLibraryItemMaintenanceActions } from "./useLibraryItemMaintenanceActions";
import { useLibraryItemWatchStateAction } from "./useLibraryItemWatchStateAction";

interface UseLibraryItemActionsInput {
	isIgnoredScope: boolean;
	selectedItems: LibraryDisplayItem[];
	onVisibleItemsRemoved: (removedCount: number) => void;
	removeSelectedKeys: (keys: Set<string>) => void;
	requestWallReload: () => void;
	updateSelectedItem: (item: LibraryDisplayItem) => void;
}

interface UseLibraryItemActionsResult {
	isIgnoringSelected: boolean;
	updatingStatusKeySet: Set<string>;
	watchStateOverrides: ReadonlyMap<string, boolean>;
	deletingKeySet: Set<string>;
	refreshingKeySet: Set<string>;
	handleEditItem: (item: LibraryDisplayItem) => void;
	handleDeleteGroup: (item: LibraryDisplayItem) => Promise<void>;
	handleRefreshItem: (item: LibraryDisplayItem) => Promise<void>;
	handleIntegrationStatusChange: (item: LibraryDisplayItem, nextStatus: IntegrationStatus | null) => Promise<void>;
	handleWatchStateChange: (item: LibraryDisplayItem, nextWatched: boolean) => Promise<void>;
	handleIgnoreSelectedItems: () => Promise<void>;
}

export function useLibraryItemActions({
																				isIgnoredScope,
																				selectedItems,
																				onVisibleItemsRemoved,
																				removeSelectedKeys,
																				requestWallReload,
																				updateSelectedItem,
																			}: UseLibraryItemActionsInput): UseLibraryItemActionsResult {
	const {
					handleEditItem,
				} = useLibraryItemEditAction();
	const {
					isIgnoringSelected,
					updatingStatusKeySet,
					handleIntegrationStatusChange,
					handleIgnoreSelectedItems,
				} = useLibraryItemIntegrationActions({
		isIgnoredScope,
		selectedItems,
		onVisibleItemsRemoved,
		removeSelectedKeys,
		requestWallReload,
		updateSelectedItem,
	});
	const {
					deletingKeySet,
					refreshingKeySet,
					handleDeleteGroup,
					handleRefreshItem,
				} = useLibraryItemMaintenanceActions({
		onVisibleItemsRemoved,
		removeSelectedKeys,
		requestWallReload,
	});
	const {
					watchStateOverrides,
					handleWatchStateChange,
				} = useLibraryItemWatchStateAction({
		requestWallReload,
		updateSelectedItem,
	});

	return {
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
	};
}
