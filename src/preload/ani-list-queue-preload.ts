import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	ipcRenderer,
	IpcRendererEvent,
} from "electron";

export const aniListQueueApi = {
	aniListQueue: {
		onPaused: (callback: (seconds: number) => void) => {
			const subscription = (_event: IpcRendererEvent, seconds: number) => {
				callback(seconds);
			};

			ipcRenderer.on(
				IpcChannels.AniListQueuePaused,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.AniListQueuePaused,
					subscription,
				);
			};
		},
	},
};
