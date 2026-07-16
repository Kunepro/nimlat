import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { OpenExternalUrlResult } from "@nimlat/types/electron-api";
import { ipcRenderer } from "electron";

export const externalNavigationApi = {
	externalNavigation: {
		openExternalUrl: (url: string): Promise<OpenExternalUrlResult> => ipcRenderer.invoke(
			IpcChannels.ExternalNavigationOpenUrl,
			url,
		),
	},
};
