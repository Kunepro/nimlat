import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { AppUpdateStatus } from "@nimlat/types/app-update";
import {
	ipcRenderer,
	type IpcRendererEvent,
} from "electron";

// Sandboxed Electron preloads expose process as a lexical binding rather than a
// reliable globalThis property. Capture the platform before contextBridge proxies
// the function into the renderer so About never reads across JavaScript worlds.
declare const process: { readonly platform: string };
const isIntegratedUpdaterVisible = process.platform !== "darwin";

export const appUpdateApi = {
	appUpdate: {
		// macOS releases are intentionally unsigned, so the renderer must not advertise an integrated update flow that
		// cannot install those builds reliably. The IPC methods remain available; this capability controls presentation only.
		isIntegratedUpdaterVisible: (): boolean => isIntegratedUpdaterVisible,
		getStatus:                  (): Promise<AppUpdateStatus> => ipcRenderer.invoke(
			IpcChannels.AppUpdateStatusGet,
		),
		checkForUpdates:            (): Promise<AppUpdateStatus> => ipcRenderer.invoke(
			IpcChannels.AppUpdateCheck,
		),
		downloadUpdate:             (): Promise<AppUpdateStatus> => ipcRenderer.invoke(
			IpcChannels.AppUpdateDownload,
		),
		installDownloadedUpdate:    (): Promise<void> => ipcRenderer.invoke(
			IpcChannels.AppUpdateInstall,
		),
		onStatusChanged:            (callback: (status: AppUpdateStatus) => void): () => void => {
			const subscription = (_event: IpcRendererEvent, status: AppUpdateStatus) => {
				callback(status);
			};

			ipcRenderer.on(
				IpcChannels.AppUpdateStatusChanged,
				subscription,
			);

			return () => {
				ipcRenderer.removeListener(
					IpcChannels.AppUpdateStatusChanged,
					subscription,
				);
			};
		},
	},
};
