import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcMain } from "electron";
import { ExternalNavigationService } from "../services/external-navigation/external-navigation-service";

export function registerExternalNavigationHandlers(): void {
	ipcMain.handle(
		IpcChannels.ExternalNavigationOpenUrl,
		(_event, url: string) => ExternalNavigationService.openExternalUrl(url),
	);
}
