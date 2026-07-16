import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";
import {
	ipcRenderer,
	IpcRendererEvent,
} from "electron";

export const animeDbUpdateApi = {
	animeDbUpdate: {
		start:                   () => ipcRenderer.invoke(
			IpcChannels.AnimeDbUpdateStart,
		),
		getStatus:               () => ipcRenderer.invoke(
			IpcChannels.AnimeDbUpdateStatus,
		),
		stop:                    () => ipcRenderer.invoke(
			IpcChannels.AnimeDbUpdateStop,
		),
		onAnimeDbUpdateProgress: (callback: (data: AnimeDbUpdateProgressData) => void) => {
			const subscription = (_event: IpcRendererEvent, data: AnimeDbUpdateProgressData) => {
				callback(data);
			};

			ipcRenderer.on(
				IpcChannels.AnimeDbUpdateProgress,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.AnimeDbUpdateProgress,
					subscription,
				);
			};
		},
	},
};
