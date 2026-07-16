import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	extractLinks,
	formatDate,
	formatReason,
	formatRetryMeta,
	sanitizeProviderCopy,
} from "./errored-content-formatters";
import { QUEUE_LABELS } from "./errored-content.constants";

export interface ErroredContentDetailRow {
	label: string;
	value: string | number;
}

export interface ErroredContentDetailViewModel {
	detailLinks: string[];
	detailRows: ErroredContentDetailRow[];
	displayedErrorMessage: string;
	queueLabel: string;
}

export function buildErroredContentDetailViewModel(item: ErroredContentItem): ErroredContentDetailViewModel {
	const displayedErrorMessage = sanitizeProviderCopy(item.errorMessage) || "No error message was recorded.";

	return {
		detailLinks: extractLinks(displayedErrorMessage),
		detailRows:  [
			{
				label: "Media ID",
				value: item.mediaId,
			},
			{
				label: "Catalog ID",
				value: item.idAniList ?? "Not recorded",
			},
			{
				label: "Episode mapping ID",
				value: item.idMal ?? "Not recorded",
			},
			{
				label: "Format",
				value: item.format ?? "Not recorded",
			},
			{
				label: "Media status",
				value: item.status ?? "Not recorded",
			},
			{
				label: "Queue",
				value: QUEUE_LABELS[ item.queue ],
			},
			{
				label: "Status",
				value: item.queueStatus,
			},
			{
				label: "Failure reason",
				value: formatReason(item),
			},
			{
				label: "Retry state",
				value: formatRetryMeta(item),
			},
			{
				label: "Last successful page",
				value: item.lastSuccessfulPage ?? "Not recorded",
			},
			{
				label: "Retry resumes from",
				value: item.resumeFromPage ?? "Start of queue",
			},
			{
				label: "Next automatic retry",
				value: formatDate(item.nextAutoRetryAt),
			},
			{
				label: "Last tried",
				value: formatDate(item.lastTriedAt),
			},
			{
				label: "Hidden",
				value: item.isHidden ? formatDate(item.hiddenAt) : "No",
			},
			{
				label: "Fingerprint",
				value: item.fingerprint,
			},
		],
		displayedErrorMessage,
		queueLabel:  QUEUE_LABELS[ item.queue ],
	};
}
