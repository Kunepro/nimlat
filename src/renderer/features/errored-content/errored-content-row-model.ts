import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	formatDate,
	formatReason,
	formatRetryMeta,
} from "./errored-content-formatters";
import { QUEUE_LABELS } from "./errored-content.constants";

export interface ErroredContentRowViewModel {
	errorMessage: string;
	errorReason: string;
	lastTriedText: string;
	mediaMeta: string;
	queueLabel: string;
	retryMeta: string;
}

export const ERRORED_CONTENT_TABLE_HEADERS = [
	"Content",
	"Queue",
	"Flags",
	"Retry / ID",
	"Error",
	"Last tried",
	"Actions",
] as const;

export function getErroredContentRowKey(item: ErroredContentItem): string {
	return `${ item.queue }:${ item.mediaId }`;
}

export function buildErroredContentRowViewModel(item: ErroredContentItem): ErroredContentRowViewModel {
	return {
		errorMessage:  item.errorMessage || "No error message was recorded.",
		errorReason:   formatReason(item),
		lastTriedText: formatDate(item.lastTriedAt),
		mediaMeta:     [
										 `Media ${ item.mediaId }`,
										 item.format,
										 item.status,
									 ].filter(Boolean).join(" - "),
		queueLabel:    QUEUE_LABELS[ item.queue ],
		retryMeta:     formatRetryMeta(item),
	};
}
