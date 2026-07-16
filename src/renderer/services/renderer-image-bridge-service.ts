import type { ElectronAPI } from "@nimlat/types/electron-api";

type RendererImagesApi = ElectronAPI["rendererImages"];
type RemoteImageRequest = Parameters<RendererImagesApi["fetchRemoteImage"]>[0];
type LocalImageRequest = Parameters<RendererImagesApi["fetchLocalImage"]>[0];

function getRemoteImageFetcher(): RendererImagesApi["fetchRemoteImage"] {
	const fetchRemoteImage = window.electronAPI?.rendererImages?.fetchRemoteImage;
	if (!fetchRemoteImage) {
		throw new Error("Renderer image bridge is not available.");
	}

	return fetchRemoteImage;
}

function getLocalImageFetcher(): RendererImagesApi["fetchLocalImage"] {
	const fetchLocalImage = window.electronAPI?.rendererImages?.fetchLocalImage;
	if (!fetchLocalImage) {
		throw new Error("Renderer local image bridge is not available.");
	}

	return fetchLocalImage;
}

// Pixi texture loading needs renderer-owned bytes rather than direct custom-protocol
// image elements, so this service centralizes the preload bridge railguard.
class RendererImageBridgeServiceImpl {
	public async fetchRemoteImage(request: RemoteImageRequest): ReturnType<RendererImagesApi["fetchRemoteImage"]> {
		return getRemoteImageFetcher()(request);
	}

	public async fetchLocalImage(request: LocalImageRequest): ReturnType<RendererImagesApi["fetchLocalImage"]> {
		return getLocalImageFetcher()(request);
	}
}

export const RendererImageBridgeService = new RendererImageBridgeServiceImpl();
