import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	RendererImageFetchRequest,
	RendererLocalImageFetchRequest,
} from "@nimlat/types/ipc-payloads";
import { ipcMain } from "electron";
import { RendererImageProxyService } from "../services/image-cache/renderer-image-proxy-service";

export function registerRendererImageHandlers(): void {
	ipcMain.handle(
		IpcChannels.RendererImageFetchRemote,
		(_event, request: RendererImageFetchRequest) => RendererImageProxyService.fetchRemoteImage(request),
	);
	ipcMain.handle(
		IpcChannels.RendererImageFetchLocal,
		(_event, request: RendererLocalImageFetchRequest) => RendererImageProxyService.fetchLocalImage(request),
	);
}
