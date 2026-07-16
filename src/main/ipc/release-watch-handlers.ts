import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { ReleaseWatchScopeFilter } from "@nimlat/types/release-watch";
import { ipcMain } from "electron";
import { ReleaseWatchReadService } from "../services/release-watch/release-watch-read-service";

// Registers IPC handlers for release-watch read models.
export function registerReleaseWatchHandlers(): void {
	ipcMain.handle(
		IpcChannels.ReleaseWatchListPast,
		(_evt, scope: ReleaseWatchScopeFilter = "tracked", limit: number = 50, offset: number = 0) => ReleaseWatchReadService.listPast(
			scope,
			limit,
			offset,
		),
	);

	ipcMain.handle(
		IpcChannels.ReleaseWatchListUpcoming,
		(_evt, scope: ReleaseWatchScopeFilter = "tracked", limit: number = 50, offset: number = 0) => ReleaseWatchReadService.listUpcoming(
			scope,
			limit,
			offset,
		),
	);
}
