import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useState,
} from "react";
import type { RowAction } from "../../../types/errored-content";
import { getRowActionKey } from "../errored-content-formatters";
import {
	addPendingActionKey,
	removePendingActionKey,
} from "../errored-content-state-model";

export type SetErroredContentActionBusy = (item: ErroredContentItem, action: RowAction, isBusy: boolean) => void;

interface UseErroredContentPendingActionsResult {
	pendingActionKeys: string[];
	setActionBusy: SetErroredContentActionBusy;
}

// Keeps row-level busy state separate from action side effects so retry/hide/report
// orchestration can stay focused on commands and user feedback.
export function useErroredContentPendingActions(): UseErroredContentPendingActionsResult {
	const [ pendingActionKeys, setActionKeys ] = useState<string[]>([]);

	const setActionBusy = useCallback<SetErroredContentActionBusy>(
		(item, action, isBusy): void => {
			const actionKey = getRowActionKey(
				item,
				action,
			);

			setActionKeys((current) => isBusy
				? addPendingActionKey(
					current,
					actionKey,
				)
				: removePendingActionKey(
					current,
					actionKey,
				));
		},
		[],
	);

	return {
		pendingActionKeys,
		setActionBusy,
	};
}
