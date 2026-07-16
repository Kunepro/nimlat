/*
 * IPC LAYER (KEEP LEAN)
 * --------------------
 * This file only wires IPC channels to services.
 * No business logic here. If logic grows, move it to src/main/services.
 */
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { ipcMain } from "electron";
import { NetworkStatusReadService } from "../services/network/network-status-read-service";

// Network handlers stay transport-thin; BUS publication is owned by the service read model.
export function registerNetworkHandlers(): void {
	ipcMain.on(
		IpcChannels.NetworkStatus,
		(_event, isOnline: boolean) => NetworkStatusReadService.updateOnlineStatusFromRenderer(isOnline),
	);
}
