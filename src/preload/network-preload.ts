import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcRenderer } from "electron";

export const networkApi = {
	network: {
		sendConnectivityStatus: (isOnline: boolean) => {
			ipcRenderer.send(
				IpcChannels.NetworkStatus,
				isOnline,
			);
		},
	},
};