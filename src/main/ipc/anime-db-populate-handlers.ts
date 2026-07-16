// IPC handlers should remain thin: delegate logic to services.
/*
 * IPC LAYER (KEEP LEAN)
 * --------------------
 * This file only wires IPC channels to services.
 * No business logic here. If logic grows, move it to src/main/services.
 */
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcMain } from "electron";
import { AnimeDbPopulationService } from "../services/anime-db/anime-db-population-service";

/**
 * Register IPC handlers for anime database population
 */
export function registerAnimeDbPopulateHandlers(): void {
	// Keep IPC lean: wiring only; business logic lives in services.
	// Handler for starting the population process
	ipcMain.handle(
		IpcChannels.PopulateAnimeDbStart,
		(_event, startPage?: number) => AnimeDbPopulationService.start(startPage),
	);

	// Handler for getting the current status
	ipcMain.handle(
		IpcChannels.PopulateAnimeDbStatus,
		() => AnimeDbPopulationService.getStatus(),
	);

	// Handler for stopping the population process
	ipcMain.handle(
		IpcChannels.PopulateAnimeDbStop,
		() => AnimeDbPopulationService.stop(),
	);

	// Handler for restarting the population process
	ipcMain.handle(
		IpcChannels.PopulateAnimeDbRestart,
		() => AnimeDbPopulationService.restart(),
	);
}
