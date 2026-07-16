import type {
	RendererImageFetchRequest,
	RendererImageFetchResponse,
	RendererLocalImageFetchRequest,
} from "@nimlat/types/ipc-payloads";
import { fetchRendererLocalImage } from "./renderer-local-image-fetcher";
import { fetchRendererRemoteImage } from "./renderer-remote-image-fetcher";

// IPC-facing image bridge facade. Remote/local policy lives in focused helpers;
// this class stays stable for handlers and tests that depend on the service API.
export class RendererImageProxyService {
	public static fetchRemoteImage(request: RendererImageFetchRequest): Promise<RendererImageFetchResponse> {
		return fetchRendererRemoteImage(request);
	}

	public static async fetchLocalImage(request: RendererLocalImageFetchRequest): Promise<RendererImageFetchResponse> {
		return fetchRendererLocalImage(request);
	}
}
