// IPC handlers should remain thin: delegate startup decisions to main services.
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcMain } from "electron";
import { getAnimeDbStartupReadiness } from "../services/anime-db/anime-db-startup-readiness-service";

export function registerAnimeDbStartupReadinessHandlers(): void {
	ipcMain.handle(
		IpcChannels.AnimeDbStartupReadinessGet,
		() => getAnimeDbStartupReadiness(),
	);
}
