import { Texture } from "pixi.js";
import { RendererImageFacade } from "../facades";
import { resolveImageSrc } from "../utils/resolve-image-src";

function isRemoteImageUrl(imageUrl: string): boolean {
	return /^(https?:)?\/\//i.test(imageUrl);
}

function isLocalBridgeCandidate(imageUrl: string): boolean {
	return !isRemoteImageUrl(imageUrl)
		&& !imageUrl.startsWith("data:")
		&& !imageUrl.startsWith("blob:");
}

function resolveLocalImagePath(imageUrl: string): string {
	if (!imageUrl.startsWith("nimlat-image://")) {
		return imageUrl;
	}

	const localPath = new URL(imageUrl).searchParams.get("path");
	if (!localPath) {
		throw new Error(`Local image protocol URL is missing a path: ${ imageUrl }`);
	}
	return localPath;
}

function loadImageElement(imageUrl: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image    = new Image();
		image.decoding = "async";
		// Pixi uploads the loaded element into a WebGL texture. Custom Electron
		// protocol images need CORS mode here even though ordinary <img> tags can
		// display them without it.
		image.crossOrigin = "anonymous";
		image.onload      = () => resolve(image);
		image.onerror     = () => reject(new Error(`Failed to load media-wall thumbnail: ${ imageUrl }`));
		image.src         = imageUrl;
	});
}

async function createTextureFromImageBitmap(blob: Blob): Promise<Texture | null> {
	if (!globalThis.createImageBitmap) {
		return null;
	}

	let imageBitmap: ImageBitmap | null = null;
	try {
		imageBitmap = await createImageBitmap(blob);
		return createCanvasBackedTexture(
			imageBitmap,
			imageBitmap.width,
			imageBitmap.height,
		);
	} catch {
		return null;
	} finally {
		imageBitmap?.close();
	}
}

function createCanvasBackedTexture(source: CanvasImageSource, width: number, height: number): Texture | null {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		return null;
	}

	const canvas  = document.createElement("canvas");
	canvas.width  = Math.floor(width);
	canvas.height = Math.floor(height);
	const context = canvas.getContext("2d");
	if (!context) {
		return null;
	}

	try {
		// Pixi receives a normal same-origin canvas, avoiding custom-protocol,
		// CORS-tainted image, and ImageBitmap upload differences across Electron.
		context.drawImage(
			source,
			0,
			0,
			canvas.width,
			canvas.height,
		);
		return Texture.from(
			canvas,
			true,
		);
	} catch {
		return null;
	}
}

async function createTextureFromBlob(blob: Blob): Promise<Texture> {
	const bitmapTexture = await createTextureFromImageBitmap(blob);
	if (bitmapTexture) {
		return bitmapTexture;
	}

	const objectUrl = URL.createObjectURL(blob);
	try {
		const image   = await loadImageElement(objectUrl);
		const texture = createCanvasBackedTexture(
			image,
			image.naturalWidth || image.width,
			image.naturalHeight || image.height,
		);
		if (!texture) {
			throw new Error(`Failed to create media-wall thumbnail texture: ${ objectUrl }`);
		}
		return texture;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

async function loadRemoteTexture(remoteUrl: string): Promise<Texture> {
	const response = await RendererImageFacade.fetchRemoteImage({ imageUrl: remoteUrl });
	const blob     = new Blob(
		[ response.bytes ],
		{ type: response.contentType },
	);

	return createTextureFromBlob(blob);
}

async function loadLocalTexture(localPath: string): Promise<Texture> {
	const response = await RendererImageFacade.fetchLocalImage({ localPath });
	const blob     = new Blob(
		[ response.bytes ],
		{ type: response.contentType },
	);

	return createTextureFromBlob(blob);
}

async function loadFetchableTexture(imageUrl: string): Promise<Texture> {
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch media-wall thumbnail: ${ imageUrl }`);
	}

	return createTextureFromBlob(await response.blob());
}

export async function loadPixiThumbnailTexture(thumbnailUrl: string): Promise<Texture> {
	const imageUrl = resolveImageSrc(thumbnailUrl);
	if (!imageUrl) {
		throw new Error("Cannot load an empty media-wall thumbnail URL.");
	}
	if (isRemoteImageUrl(imageUrl)) {
		// Provider CDN images must first pass through the main-process bridge so
		// Pixi receives decoded same-origin bytes instead of a CORS-tainted image.
		return loadRemoteTexture(imageUrl);
	}
	if (isLocalBridgeCandidate(imageUrl)) {
		// Local cache files also enter Pixi as bytes from main. Renderer fetch of the
		// custom Electron protocol can fail before the protocol handler exposes status.
		return loadLocalTexture(resolveLocalImagePath(imageUrl));
	}

	// Custom Electron protocol and data/blob URLs should also enter Pixi as renderer-owned
	// decoded bytes; direct image elements can render in DOM while still failing WebGL upload.
	return loadFetchableTexture(imageUrl);
}

export async function unloadPixiThumbnailTexture(thumbnailUrl: string, texture: Texture): Promise<void> {
	if (!texture.destroyed) {
		texture.destroy(true);
	}
}
