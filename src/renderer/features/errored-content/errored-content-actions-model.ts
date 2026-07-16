import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import type { RowAction } from "../../types/errored-content";
import { getRowActionKey } from "./errored-content-formatters";

export interface ErroredContentActionState {
	hideDisabled: boolean;
	isHiding: boolean;
	isReporting: boolean;
	isRetryRecommended: boolean;
	isRetrying: boolean;
	reportDisabled: boolean;
	retryDisabled: boolean;
	retryTooltip: string;
}

export function isErroredContentActionPending(
	item: ErroredContentItem,
	action: RowAction,
	pendingActionKeys: string[],
): boolean {
	return pendingActionKeys.includes(getRowActionKey(
		item,
		action,
	));
}

export function buildErroredContentActionState(
	item: ErroredContentItem,
	pendingActionKeys: string[],
): ErroredContentActionState {
	const isRetrying  = isErroredContentActionPending(
		item,
		"retry",
		pendingActionKeys,
	);
	const isHiding    = isErroredContentActionPending(
		item,
		"hide",
		pendingActionKeys,
	);
	const isReporting = isErroredContentActionPending(
		item,
		"report",
		pendingActionKeys,
	);

	return {
		hideDisabled:       item.isHidden || isRetrying || isReporting,
		isHiding,
		isReporting,
		isRetryRecommended: item.recommendedAction === "retry",
		isRetrying,
		reportDisabled:     isRetrying || isHiding,
		retryDisabled:      !item.canRetry || isHiding || isReporting,
		retryTooltip:       item.canRetry ? "Retry" : "Non-retryable",
	};
}
