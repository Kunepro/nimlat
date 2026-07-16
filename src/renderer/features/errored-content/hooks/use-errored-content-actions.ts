import type {
	ErroredContentItem,
	ErroredContentQueue,
} from "@nimlat/types/ipc-payloads";
import { useErroredContentItemActions } from "./use-errored-content-item-actions";
import { useErroredContentPendingActions } from "./use-errored-content-pending-actions";
import { useErroredContentRetryAllAction } from "./use-errored-content-retry-all-action";

interface UseErroredContentActionsInput {
	queue: ErroredContentQueue | null;
	loadPage: (offset?: number) => Promise<void>;
}

interface UseErroredContentActionsResult {
	isRetryingAll: boolean;
	pendingActionKeys: string[];
	retryItem: (item: ErroredContentItem) => Promise<void>;
	retryAll: () => Promise<void>;
	hideItem: (item: ErroredContentItem) => Promise<void>;
	reportItem: (item: ErroredContentItem) => Promise<void>;
}

export function useErroredContentActions({
																					 queue,
																					 loadPage,
																				 }: UseErroredContentActionsInput): UseErroredContentActionsResult {
	const {
					pendingActionKeys,
					setActionBusy,
				} = useErroredContentPendingActions();
	const {
					retryItem,
					hideItem,
					reportItem,
				} = useErroredContentItemActions({
		loadPage,
		setActionBusy,
	});
	const {
					isRetryingAll,
					retryAll,
				} = useErroredContentRetryAllAction({
		queue,
		loadPage,
	});

	return {
		isRetryingAll,
		pendingActionKeys,
		retryItem,
		retryAll,
		hideItem,
		reportItem,
	};
}
