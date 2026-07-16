import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import {
	ipcRenderer,
	IpcRendererEvent,
} from "electron";

export const toasterApi = {
	toaster: {
		onToasterMessage: (callback: (event: ToasterMessageEvent) => void) => {
			const subscription = (_event: IpcRendererEvent, event: ToasterMessageEvent) => {
				callback(event);
			};

			ipcRenderer.on(
				IpcChannels.ToasterMessage,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ToasterMessage,
					subscription,
				);
			};
		},
	},
};
