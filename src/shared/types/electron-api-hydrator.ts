import type {
	ErroredContentPage,
	ErroredContentQueue,
	HideErroredContentRequest,
	HideErroredContentResult,
	HydratorProgressEvent,
	ReportErroredContentRequest,
	ReportErroredContentResult,
	RetryAllErroredContentResult,
	RetryErroredContentRequest,
	RetryErroredContentResult,
} from "./ipc-hydrator-payloads";

// Hydrator API is renderer-visible queue supervision only. Provider calls and
// retry policy stay in main process services/DB operations.
export interface HydratorElectronApi {
	listErroredContent(offset: number, limit: number, queue?: ErroredContentQueue | null, includeHidden?: boolean): Promise<ErroredContentPage>;

	retryErroredContent(request: RetryErroredContentRequest): Promise<RetryErroredContentResult>;

	retryAllErroredContent(queue?: ErroredContentQueue | null): Promise<RetryAllErroredContentResult>;

	hideErroredContent(request: HideErroredContentRequest): Promise<HideErroredContentResult>;

	reportErroredContent(request: ReportErroredContentRequest): Promise<ReportErroredContentResult>;

	getProgressSnapshot(): Promise<HydratorProgressEvent[]>;

	onQueueChanged(callback: () => void): () => void;

	onProgress(callback: (event: HydratorProgressEvent) => void): () => void;
}
