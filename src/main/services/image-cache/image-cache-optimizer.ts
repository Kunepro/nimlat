import type { ImageRole } from "@nimlat/types/anime-db";
import { nativeImage } from "electron";
import type { CacheImageVariant } from "./image-cache-types";

const OPTIMIZED_IMAGE_QUALITY = 82;
const FULL_SIZE_IMAGE_QUALITY = 92;
const OPTIMIZED_IMAGE_BOUNDS_BY_ROLE: Record<ImageRole, {
	width: number;
	height: number;
}>                            = {
	// Largest current library card poster is 204x293 CSS px. Cache at 2x so retina canvases avoid upscaling.
	primary: {
		width:  408,
		height: 586,
	},
	// Banners are not used in library cards, but keeping a bounded local copy prevents unbounded provider payloads.
	banner:    {
		width:  1280,
		height: 480,
	},
	thumbnail: {
		width:  408,
		height: 230,
	},
};

export function createOptimizedImageBuffer(
	sourceBuffer: Buffer,
	imageRole: ImageRole,
	cacheVariant: CacheImageVariant,
): Buffer {
	const sourceImage = nativeImage.createFromBuffer(sourceBuffer);
	if (sourceImage.isEmpty()) {
		throw new Error("Image cache could not decode source image bytes.");
	}

	if (cacheVariant === "full-size") {
		const outputBuffer = sourceImage.toJPEG(FULL_SIZE_IMAGE_QUALITY);
		if (outputBuffer.byteLength <= 0) {
			throw new Error("Image cache failed to encode full-size JPEG bytes.");
		}
		return outputBuffer;
	}

	const bounds = OPTIMIZED_IMAGE_BOUNDS_BY_ROLE[ imageRole ];
	const size   = sourceImage.getSize();
	if (size.width <= 0 || size.height <= 0) {
		throw new Error("Image cache decoded an image with invalid dimensions.");
	}

	const scale       = Math.min(
		1,
		bounds.width / size.width,
		bounds.height / size.height,
	);
	const outputImage = scale < 1
		? sourceImage.resize({
			width:   Math.max(
				1,
				Math.round(size.width * scale),
			),
			height:  Math.max(
				1,
				Math.round(size.height * scale),
			),
			quality: "best",
		})
		: sourceImage;

	const outputBuffer = outputImage.toJPEG(OPTIMIZED_IMAGE_QUALITY);
	if (outputBuffer.byteLength <= 0) {
		throw new Error("Image cache failed to encode optimized JPEG bytes.");
	}
	return outputBuffer;
}
