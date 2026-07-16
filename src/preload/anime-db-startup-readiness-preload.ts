import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { AnimeDbStartupReadiness } from "@nimlat/types/ipc-payloads";
import { ipcRenderer } from "electron";

export const animeDbStartupApi = {
	animeDbStartup: {
		getReadiness: (): Promise<AnimeDbStartupReadiness> => ipcRenderer.invoke(
			IpcChannels.AnimeDbStartupReadinessGet,
		),
	},
};
