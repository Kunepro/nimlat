// IPC handlers should remain thin: delegate logic to services.
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcMain } from "electron";
import { AnimeDbUpdateService } from "../services/anime-db/anime-db-update-service";

export function registerAnimeDbUpdateHandlers(): void {
	ipcMain.handle(
		IpcChannels.AnimeDbUpdateStart,
		() => AnimeDbUpdateService.start(),
	);

	ipcMain.handle(
		IpcChannels.AnimeDbUpdateStatus,
		() => AnimeDbUpdateService.getStatus(),
	);

	ipcMain.handle(
		IpcChannels.AnimeDbUpdateStop,
		() => AnimeDbUpdateService.stop(),
	);
}
