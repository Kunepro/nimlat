import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import {
	ipcRenderer,
	IpcRendererEvent,
} from "electron";

export const animeDbPopulateApi = {
	animeDbPopulation: {
		start:                     (startPage?: number) => ipcRenderer.invoke(
			IpcChannels.PopulateAnimeDbStart,
			startPage,
		),
		getStatus:                 () => ipcRenderer.invoke(
			IpcChannels.PopulateAnimeDbStatus,
		),
		stop:                      () => ipcRenderer.invoke(
			IpcChannels.PopulateAnimeDbStop,
		),
		restart:                   () => ipcRenderer.invoke(
			IpcChannels.PopulateAnimeDbRestart,
		),
		onPopulateAnimeDbProgress: (callback: (data: PopulateAnimeDbProgressData) => void) => {
			const subscription = (_event: IpcRendererEvent, data: PopulateAnimeDbProgressData) => {
				callback(data);
			};

			ipcRenderer.on(
				IpcChannels.PopulateAnimeDbProgress,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.PopulateAnimeDbProgress,
					subscription,
				);
			};
		},
	},
};
