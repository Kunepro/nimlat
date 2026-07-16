import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	RendererImageFetchRequest,
	RendererImageFetchResponse,
	RendererLocalImageFetchRequest,
} from "@nimlat/types/ipc-payloads";
import { ipcRenderer } from "electron";

export const rendererImagesApi = {
	rendererImages: {
		fetchRemoteImage: (request: RendererImageFetchRequest): Promise<RendererImageFetchResponse> => ipcRenderer.invoke(
			IpcChannels.RendererImageFetchRemote,
			request,
		),
		fetchLocalImage: (request: RendererLocalImageFetchRequest): Promise<RendererImageFetchResponse> => ipcRenderer.invoke(
			IpcChannels.RendererImageFetchLocal,
			request,
		),
	},
};
