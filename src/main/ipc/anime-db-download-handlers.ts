/*
 * IPC LAYER (KEEP LEAN)
 * --------------------
 * This file only wires IPC channels to services.
 * No business logic here. If logic grows, move it to src/main/services.
 */
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcMain } from "electron";
import {
	cancelAnimeDbDownload,
	getAnimeDbDownloadReleaseStatus,
	getAnimeDbDownloadStatus,
	startAnimeDbDownload,
} from "../services/anime-db/anime-db-download-service";

export function registerAnimeDbDownloadHandlers(): void {
	ipcMain.handle(
		IpcChannels.AnimeDbDownloadStart,
		() => startAnimeDbDownload(),
	);

	ipcMain.handle(
		IpcChannels.AnimeDbDownloadStatus,
		() => getAnimeDbDownloadStatus(),
	);

	ipcMain.handle(
		IpcChannels.AnimeDbDownloadReleaseStatus,
		() => getAnimeDbDownloadReleaseStatus(),
	);

	ipcMain.handle(
		IpcChannels.AnimeDbDownloadCancel,
		() => cancelAnimeDbDownload(),
	);
}
