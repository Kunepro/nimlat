import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
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
} from "@nimlat/types/ipc-payloads";
import {
	ipcRenderer,
	IpcRendererEvent,
} from "electron";

export const hydratorApi = {
	hydrator: {
		listErroredContent:     (offset: number, limit: number, queue: ErroredContentQueue | null = null, includeHidden = false): Promise<ErroredContentPage> => ipcRenderer.invoke(
			IpcChannels.ErroredContentList,
			offset,
			limit,
			queue,
			includeHidden,
		),
		retryErroredContent:  (request: RetryErroredContentRequest): Promise<RetryErroredContentResult> => ipcRenderer.invoke(
			IpcChannels.ErroredContentRetry,
			request,
		),
		retryAllErroredContent: (queue: ErroredContentQueue | null = null): Promise<RetryAllErroredContentResult> => ipcRenderer.invoke(
			IpcChannels.ErroredContentRetryAll,
			queue,
		),
		hideErroredContent:   (request: HideErroredContentRequest): Promise<HideErroredContentResult> => ipcRenderer.invoke(
			IpcChannels.ErroredContentHide,
			request,
		),
		reportErroredContent: (request: ReportErroredContentRequest): Promise<ReportErroredContentResult> => ipcRenderer.invoke(
			IpcChannels.ErroredContentReport,
			request,
		),
		getProgressSnapshot:  (): Promise<HydratorProgressEvent[]> => ipcRenderer.invoke(
			IpcChannels.HydratorProgressSnapshotGet,
		),
		onQueueChanged:       (callback: () => void) => {
			const listener = () => callback();

			ipcRenderer.on(
				IpcChannels.MediaHydrationQueueChanged,
				listener,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.MediaHydrationQueueChanged,
					listener,
				);
			};
		},
		onProgress:           (callback: (event: HydratorProgressEvent) => void) => {
			const listener = (_event: IpcRendererEvent, event: HydratorProgressEvent) => callback(event);

			ipcRenderer.on(
				IpcChannels.HydratorProgress,
				listener,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.HydratorProgress,
					listener,
				);
			};
		},
	},
};
