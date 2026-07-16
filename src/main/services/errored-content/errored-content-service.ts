import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	ErroredContentPage,
	ErroredContentQueue,
	HideErroredContentRequest,
	HideErroredContentResult,
	ReportErroredContentRequest,
	ReportErroredContentResult,
	RetryAllErroredContentRequest,
	RetryAllErroredContentResult,
	RetryErroredContentRequest,
	RetryErroredContentResult,
} from "@nimlat/types/ipc-payloads";
import { shell } from "electron";
import { resolveErroredContentReportUrl } from "./errored-content-report-service";

const MAX_ERRORED_CONTENT_PAGE_LIMIT = 100;

// Errored-content policy:
// - Rows disappear automatically when the owning queue row is no longer failed or pending retry.
// - Pending retry rows stay visible so users know automatic retry is already planned.
// - Retryable rows can be moved back to `pending`; terminal provider/data failures should be reported and hidden.
// - Hiding records a review marker only; it does not delete queue rows or media/group/episode data.
// - GitHub reporting is browser-mediated so the user uses their own GitHub credentials and confirms any issue/comment.
// - Future error classes that require stronger remediation, such as wiping/reloading one Media, should be added here
//   before the UI exposes that action.

function normalizePageLimit(limit: number): number {
	return Math.min(
		MAX_ERRORED_CONTENT_PAGE_LIMIT,
		Math.max(
			1,
			Math.floor(limit),
		),
	);
}

function normalizeOffset(offset: number): number {
	return Math.max(
		0,
		Math.floor(offset),
	);
}

export function listErroredContent(
	offset: number,
	limit: number,
	queue: ErroredContentQueue | null = null,
	includeHidden = false,
): ErroredContentPage {
	return AnimeDbFacade.listErroredContent(
		normalizeOffset(offset),
		normalizePageLimit(limit),
		queue,
		includeHidden,
	);
}

export function retryErroredContent(request: RetryErroredContentRequest): RetryErroredContentResult {
	try {
		const item = AnimeDbFacade.getErroredContent(request);
		if (!item) {
			return {
				success: false,
				error:   "This failed item is no longer available.",
			};
		}

		if (!item.canRetry) {
			return {
				success: false,
				error: "This failure is not retryable. Report it or hide it from this list.",
			};
		}

		const didRetry = AnimeDbFacade.retryErroredContent(request);
		if (!didRetry) {
			return {
				success: false,
				error:   "This failed item is no longer available.",
			};
		}

		// Retrying only changes queue state; daemon consumers own the actual reprocessing.
		BUS_HydratorQueueChanges.next();
		return { success: true };
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"errored-content.retry",
			tsError,
			{ ...request },
		);
		return {
			success: false,
			error:   tsError.message,
		};
	}
}

export function retryAllErroredContent(request: RetryAllErroredContentRequest): RetryAllErroredContentResult {
	try {
		const retriedCount = AnimeDbFacade.retryAllErroredContent(request.queue ?? null);
		if (retriedCount > 0) {
			BUS_HydratorQueueChanges.next();
		}

		return {
			success: true,
			retriedCount,
		};
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"errored-content.retry-all",
			tsError,
			{ queue: request.queue ?? null },
		);
		return {
			success: false,
			error:   tsError.message,
		};
	}
}

export function hideErroredContent(request: HideErroredContentRequest): HideErroredContentResult {
	try {
		const didHide = AnimeDbFacade.hideErroredContent(request);
		if (!didHide) {
			return {
				success: false,
				error:   "This failed item is no longer available.",
			};
		}

		BUS_HydratorQueueChanges.next();
		return { success: true };
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"errored-content.hide",
			tsError,
			{ ...request },
		);
		return {
			success: false,
			error:   tsError.message,
		};
	}
}

export async function reportErroredContent(request: ReportErroredContentRequest): Promise<ReportErroredContentResult> {
	try {
		const item = AnimeDbFacade.getErroredContent(request);
		if (!item) {
			return {
				success: false,
				error:   "This failed item is no longer available.",
			};
		}

		const reportUrl = await resolveErroredContentReportUrl(item);
		await shell.openExternal(reportUrl);

		return {
			success: true,
			fingerprint: item.fingerprint,
			reportUrl,
		};
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"errored-content.report",
			tsError,
			{ ...request },
		);
		return {
			success: false,
			error:   tsError.message,
		};
	}
}
