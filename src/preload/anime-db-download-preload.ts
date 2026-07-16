import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	AnimeDbDownloadActionResult,
	AnimeDbDownloadProgressData,
	AnimeDbDownloadReleaseStatus,
} from "@nimlat/types/ipc-payloads";
import {
	ipcRenderer,
	IpcRendererEvent,
} from "electron";

export const animeDbDownloadApi = {
	animeDbDownload: {
		start:                     (): Promise<AnimeDbDownloadActionResult> => ipcRenderer.invoke(IpcChannels.AnimeDbDownloadStart),
		getStatus:                 (): Promise<AnimeDbDownloadProgressData> => ipcRenderer.invoke(IpcChannels.AnimeDbDownloadStatus),
		getReleaseStatus:          (): Promise<AnimeDbDownloadReleaseStatus> => ipcRenderer.invoke(IpcChannels.AnimeDbDownloadReleaseStatus),
		cancel:                    (): Promise<AnimeDbDownloadActionResult> => ipcRenderer.invoke(IpcChannels.AnimeDbDownloadCancel),
		onAnimeDbDownloadProgress: (callback: (data: AnimeDbDownloadProgressData) => void) => {
			const subscription = (_event: IpcRendererEvent, data: AnimeDbDownloadProgressData) => {
				callback(data);
			};

			ipcRenderer.on(
				IpcChannels.AnimeDbDownloadProgress,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.AnimeDbDownloadProgress,
					subscription,
				);
			};
		},
	},
};
