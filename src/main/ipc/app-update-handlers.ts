// IPC handlers should remain thin: all updater rules live in AppUpdateService.
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcMain } from "electron";
import { AppUpdateService } from "../services/app-update/app-update-service";

export function registerAppUpdateHandlers(): void {
	ipcMain.handle(
		IpcChannels.AppUpdateStatusGet,
		() => AppUpdateService.getStatus(),
	);

	ipcMain.handle(
		IpcChannels.AppUpdateCheck,
		() => AppUpdateService.checkForUpdates(),
	);

	ipcMain.handle(
		IpcChannels.AppUpdateDownload,
		() => AppUpdateService.downloadUpdate(),
	);

	ipcMain.handle(
		IpcChannels.AppUpdateInstall,
		() => AppUpdateService.installDownloadedUpdate(),
	);
}
