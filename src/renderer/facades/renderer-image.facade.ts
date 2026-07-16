import { RendererImageBridgeService } from "../services/renderer-image-bridge-service";

type RendererImageApi = typeof RendererImageBridgeService;

export class RendererImageFacade {
	public static fetchRemoteImage(...args: Parameters<RendererImageApi["fetchRemoteImage"]>): ReturnType<RendererImageApi["fetchRemoteImage"]> {
		return RendererImageBridgeService.fetchRemoteImage(...args);
	}

	public static fetchLocalImage(...args: Parameters<RendererImageApi["fetchLocalImage"]>): ReturnType<RendererImageApi["fetchLocalImage"]> {
		return RendererImageBridgeService.fetchLocalImage(...args);
	}
}
