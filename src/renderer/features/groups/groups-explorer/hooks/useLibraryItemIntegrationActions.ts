import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useState,
} from "react";
import { useAppMessage } from "../../../../hooks";
import {
	formatLibraryActionError,
	formatLibraryBatchFailureMessage,
	getLibraryItemKeySet,
	getSingleLibraryItemKeySet,
	isLibraryItemIntegrationActionable,
	leavesCurrentLibraryScope,
	setLibraryItemIntegrationStatus,
	summarizeLibraryItemActionOutcomes,
} from "../library-item-actions-model";
import {
	collectLibraryItemIntegrationActionOutcomes,
	persistLibraryItemIntegrationStatus,
} from "../library-item-integration-actions-runner";
import { useLibraryBusyKeySet } from "./useLibraryBusyKeySet";

interface LibraryItemIntegrationActionsInput {
	isIgnoredScope: boolean;
	selectedItems: LibraryDisplayItem[];
	onVisibleItemsRemoved: (removedCount: number) => void;
	removeSelectedKeys: (keys: Set<string>) => void;
	requestWallReload: () => void;
	updateSelectedItem: (item: LibraryDisplayItem) => void;
}

interface LibraryItemIntegrationActionsController {
	isIgnoringSelected: boolean;
	updatingStatusKeySet: Set<string>;
	handleIntegrationStatusChange: (item: LibraryDisplayItem, nextStatus: IntegrationStatus | null) => Promise<void>;
	handleIgnoreSelectedItems: () => Promise<void>;
}

export function useLibraryItemIntegrationActions({
																									 isIgnoredScope,
																									 selectedItems,
																									 onVisibleItemsRemoved,
																									 removeSelectedKeys,
																									 requestWallReload,
																									 updateSelectedItem,
																								 }: LibraryItemIntegrationActionsInput): LibraryItemIntegrationActionsController {
	const messageApi                                  = useAppMessage();
	const {
					keySet:     updatingStatusKeySet,
					addKeys:    addUpdatingStatusKeys,
					removeKeys: removeUpdatingStatusKeys,
				}                                           = useLibraryBusyKeySet();
	const [ isIgnoringSelected, setIgnoringSelected ] = useState(false);

	const handleIgnoreSelectedItems = useCallback(
		async () => {
			if (selectedItems.length === 0 || isIgnoringSelected) {
				return;
			}

			const ignoredStatus: IntegrationStatus = "ignored";
			const selectedItemSnapshot             = [ ...selectedItems ];
			const selectedKeySnapshot              = getLibraryItemKeySet(selectedItemSnapshot);
			try {
				setIgnoringSelected(true);
				addUpdatingStatusKeys(selectedKeySnapshot);

				// Each selected item owns an independent persisted integration state. A partial
				// batch must reconcile successes immediately instead of leaving already-written
				// DB changes visible as stale selected cards until a later reload.
				const actionOutcomes = await collectLibraryItemIntegrationActionOutcomes(
					selectedItemSnapshot,
					ignoredStatus,
				);
				const batchOutcome   = summarizeLibraryItemActionOutcomes(actionOutcomes);

				if (batchOutcome.succeededCount > 0) {
					removeSelectedKeys(batchOutcome.succeededKeySet);
					onVisibleItemsRemoved(batchOutcome.succeededCount);
					requestWallReload();
				}

				const failureMessage = formatLibraryBatchFailureMessage(
					"ignore",
					batchOutcome.failedMessages,
				);
				if (failureMessage) {
					messageApi.error(failureMessage);
				}
			} finally {
				setIgnoringSelected(false);
				removeUpdatingStatusKeys(selectedKeySnapshot);
			}
		},
		[
			addUpdatingStatusKeys,
			isIgnoringSelected,
			messageApi,
			onVisibleItemsRemoved,
			removeSelectedKeys,
			removeUpdatingStatusKeys,
			requestWallReload,
			selectedItems,
		],
	);

	const handleIntegrationStatusChange = useCallback(
		async (item: LibraryDisplayItem, nextStatus: IntegrationStatus | null) => {
			const itemKeySet = getSingleLibraryItemKeySet(item);
			try {
				addUpdatingStatusKeys(itemKeySet);

				if (!isLibraryItemIntegrationActionable(item)) {
					messageApi.error("This item cannot update integration status.");
					return;
				}

				const result = await persistLibraryItemIntegrationStatus(
					item,
					nextStatus,
				);
				if (!result?.success) {
					if (result?.error) {
						messageApi.error(result.error);
					}
					return;
				}

				if (leavesCurrentLibraryScope(
					isIgnoredScope,
					nextStatus,
				)) {
					removeSelectedKeys(itemKeySet);
					onVisibleItemsRemoved(1);
				} else {
					updateSelectedItem(setLibraryItemIntegrationStatus(
						item,
						nextStatus,
					));
				}
				requestWallReload();
			} catch (error) {
				messageApi.error(`Failed to update integration status: ${ formatLibraryActionError(
					error,
					"unknown error",
				) }`);
			} finally {
				removeUpdatingStatusKeys(itemKeySet);
			}
		},
		[
			addUpdatingStatusKeys,
			isIgnoredScope,
			messageApi,
			onVisibleItemsRemoved,
			removeSelectedKeys,
			removeUpdatingStatusKeys,
			requestWallReload,
			updateSelectedItem,
		],
	);

	return {
		isIgnoringSelected,
		updatingStatusKeySet,
		handleIntegrationStatusChange,
		handleIgnoreSelectedItems,
	};
}
