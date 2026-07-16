import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	ErroredContentQueue,
	HideErroredContentRequest,
	ReportErroredContentRequest,
	RetryErroredContentRequest,
} from "@nimlat/types/ipc-payloads";
import { ipcMain } from "electron";
import {
	hideErroredContent,
	listErroredContent,
	reportErroredContent,
	retryAllErroredContent,
	retryErroredContent,
} from "../services/errored-content/errored-content-service";
import { getHydratorProgressSnapshot } from "../services/hydrator/hydrator-progress-store";

/**
 * Keeps hydrator IPC minimal: renderer can read the current active snapshot,
 * then subscribe to event bridges for live updates.
 */
export function registerHydratorHandlers(): void {
	ipcMain.handle(
		IpcChannels.ErroredContentList,
		(_event, offset: number, limit: number, queue: ErroredContentQueue | null = null, includeHidden = false) => listErroredContent(
			offset,
			limit,
			queue,
			includeHidden,
		),
	);

	ipcMain.handle(
		IpcChannels.ErroredContentRetry,
		(_event, request: RetryErroredContentRequest) => retryErroredContent(request),
	);

	ipcMain.handle(
		IpcChannels.ErroredContentRetryAll,
		(_event, queue: ErroredContentQueue | null = null) => retryAllErroredContent({ queue }),
	);

	ipcMain.handle(
		IpcChannels.ErroredContentHide,
		(_event, request: HideErroredContentRequest) => hideErroredContent(request),
	);

	ipcMain.handle(
		IpcChannels.ErroredContentReport,
		(_event, request: ReportErroredContentRequest) => reportErroredContent(request),
	);

	ipcMain.handle(
		IpcChannels.HydratorProgressSnapshotGet,
		() => getHydratorProgressSnapshot(),
	);
}
