import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import { useCallback } from "react";
import { useAppMessage } from "../../../../hooks";
import {
	formatLibraryActionError,
	getSingleLibraryItemKeySet,
	isLibraryItemDeletableGroup,
	isLibraryItemRefreshable,
} from "../library-item-actions-model";
import {
	deleteLibraryManualGroup,
	persistLibraryItemRefresh,
} from "../library-item-actions-runner";
import { useLibraryBusyKeySet } from "./useLibraryBusyKeySet";

interface LibraryItemMaintenanceActionsInput {
	onVisibleItemsRemoved: (removedCount: number) => void;
	removeSelectedKeys: (keys: Set<string>) => void;
	requestWallReload: () => void;
}

interface LibraryItemMaintenanceActionsController {
	deletingKeySet: Set<string>;
	refreshingKeySet: Set<string>;
	handleDeleteGroup: (item: LibraryDisplayItem) => Promise<void>;
	handleRefreshItem: (item: LibraryDisplayItem) => Promise<void>;
}

export function useLibraryItemMaintenanceActions({
																									 onVisibleItemsRemoved,
																									 removeSelectedKeys,
																									 requestWallReload,
																								 }: LibraryItemMaintenanceActionsInput): LibraryItemMaintenanceActionsController {
	const messageApi = useAppMessage();
	const {
					keySet:     deletingKeySet,
					addKeys:    addDeletingKeys,
					removeKeys: removeDeletingKeys,
				}          = useLibraryBusyKeySet();
	const {
					keySet:     refreshingKeySet,
					addKeys:    addRefreshingKeys,
					removeKeys: removeRefreshingKeys,
				}          = useLibraryBusyKeySet();

	const handleDeleteGroup = useCallback(
		async (item: LibraryDisplayItem) => {
			if (!isLibraryItemDeletableGroup(item)) {
				messageApi.error("This item cannot be deleted as a group.");
				return;
			}

			const itemKeySet = getSingleLibraryItemKeySet(item);
			try {
				addDeletingKeys(itemKeySet);
				const result = await deleteLibraryManualGroup(item.group);
				if (!result.success) {
					messageApi.error(result.error);
					return;
				}

				removeSelectedKeys(itemKeySet);
				onVisibleItemsRemoved(1);
				requestWallReload();
			} catch (error) {
				messageApi.error(`Failed to delete group: ${ formatLibraryActionError(
					error,
					"unknown error",
				) }`);
			} finally {
				removeDeletingKeys(itemKeySet);
			}
		},
		[
			addDeletingKeys,
			messageApi,
			onVisibleItemsRemoved,
			removeDeletingKeys,
			removeSelectedKeys,
			requestWallReload,
		],
	);

	const handleRefreshItem = useCallback(
		async (item: LibraryDisplayItem) => {
			const itemKeySet = getSingleLibraryItemKeySet(item);
			try {
				addRefreshingKeys(itemKeySet);

				if (!isLibraryItemRefreshable(item)) {
					messageApi.error("This item cannot be refreshed.");
					return;
				}

				const result = await persistLibraryItemRefresh(item);
				if (!result) {
					messageApi.error("This item cannot be refreshed.");
					return;
				}

				if (!result.success) {
					messageApi.error(result.error);
					return;
				}
				requestWallReload();
			} catch (error) {
				messageApi.error(`Failed to refresh item: ${ formatLibraryActionError(
					error,
					"unknown error",
				) }`);
			} finally {
				removeRefreshingKeys(itemKeySet);
			}
		},
		[
			addRefreshingKeys,
			messageApi,
			removeRefreshingKeys,
			requestWallReload,
		],
	);

	return {
		deletingKeySet,
		refreshingKeySet,
		handleDeleteGroup,
		handleRefreshItem,
	};
}
