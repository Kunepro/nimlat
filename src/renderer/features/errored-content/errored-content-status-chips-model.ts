import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";

export interface ErroredContentStatusChipsViewModel {
	actionHintColor: string;
	actionHintLabel: string;
	shouldShowHiddenChip: boolean;
	statusColor: string;
	statusLabel: string;
}

export function buildErroredContentStatusChipsViewModel(
	item: ErroredContentItem,
): ErroredContentStatusChipsViewModel {
	const statusColor = item.isHidden
		? "default"
		: item.isAutoRetryPlanned ? "green" : item.isRetryExhausted ? "volcano" : "red";
	const statusLabel = item.isHidden
		? "Hidden"
		: item.isAutoRetryPlanned ? "Auto retry planned" : item.isRetryExhausted ? "Retries exhausted" : "Needs review";

	return {
		actionHintColor:      item.recommendedAction === "report" ? "orange" : "blue",
		actionHintLabel:      item.recommendedAction === "report" ? "Report recommended" : "Retry recommended",
		shouldShowHiddenChip: item.isHidden,
		statusColor,
		statusLabel,
	};
}
