import type { RendererImageFetchResponse } from "@nimlat/types/ipc-payloads";
import { extname } from "node:path";

export const MAX_RENDERER_IMAGE_BYTES = 15 * 1024 * 1024;

const TRANSPARENT_PNG_BYTES = Uint8Array.from([
	0x89,
	0x50,
	0x4e,
	0x47,
	0x0d,
	0x0a,
	0x1a,
	0x0a,
	0x00,
	0x00,
	0x00,
	0x0d,
	0x49,
	0x48,
	0x44,
	0x52,
	0x00,
	0x00,
	0x00,
	0x01,
	0x00,
	0x00,
	0x00,
	0x01,
	0x08,
	0x06,
	0x00,
	0x00,
	0x00,
	0x1f,
	0x15,
	0xc4,
	0x89,
	0x00,
	0x00,
	0x00,
	0x0a,
	0x49,
	0x44,
	0x41,
	0x54,
	0x78,
	0x9c,
	0x63,
	0x00,
	0x01,
	0x00,
	0x00,
	0x05,
	0x00,
	0x01,
	0x0d,
	0x0a,
	0x2d,
	0xb4,
	0x00,
	0x00,
	0x00,
	0x00,
	0x49,
	0x45,
	0x4e,
	0x44,
	0xae,
	0x42,
	0x60,
	0x82,
]);

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
	".avif": "image/avif",
	".bmp":  "image/bmp",
	".gif":  "image/gif",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".svg":  "image/svg+xml",
	".webp": "image/webp",
};

export function toExactArrayBuffer(buffer: Buffer): ArrayBuffer {
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength,
	) as ArrayBuffer;
}

export function createTransparentImageResponse(): RendererImageFetchResponse {
	return {
		bytes:       toExactArrayBuffer(Buffer.from(TRANSPARENT_PNG_BYTES)),
		contentType: "image/png",
	};
}

export function getLocalImageContentType(localPath: string): string {
	return CONTENT_TYPE_BY_EXTENSION[ extname(localPath).toLowerCase() ] ?? "application/octet-stream";
}

export function normalizeResponseContentType(response: Response): string {
	return response.headers.get("content-type")?.split(";")[ 0 ]?.trim().toLowerCase() || "application/octet-stream";
}
