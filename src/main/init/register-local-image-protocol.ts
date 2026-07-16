import { PATH_DATA } from "@nimlat/constants/main/system-folders";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import { protocol } from "electron";
import {
	existsSync,
	readFileSync,
} from "node:fs";
import {
	extname,
	normalize,
	relative,
	resolve,
	sep,
} from "node:path";
import { fileURLToPath } from "node:url";

export const LOCAL_IMAGE_PROTOCOL = "nimlat-image";

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

function isInsideAllowedDataPath(candidatePath: string): boolean {
	const resolvedRoot      = resolve(PATH_DATA);
	const resolvedCandidate = resolve(candidatePath);
	const relativePath      = relative(
		resolvedRoot,
		resolvedCandidate,
	);

	return relativePath !== ""
		&& !relativePath.startsWith("..")
		&& !relativePath.includes(`..${ sep }`);
}

function resolveRequestedLocalPath(rawPath: string): string {
	if (rawPath.startsWith("file:")) {
		return fileURLToPath(rawPath);
	}

	return rawPath;
}

/**
 * Serve app-owned local image files through a dedicated Electron protocol so the
 * renderer never needs direct `file:///` access from the Vite dev origin.
 */
export function registerLocalImageProtocol(): void {
	protocol.handle(
		LOCAL_IMAGE_PROTOCOL,
		(request) => {
			try {
				const requestUrl = new URL(request.url);
				const localPath  = requestUrl.searchParams.get("path");

				if (!localPath) {
					return new Response(
						"Missing image path.",
						{ status: 400 },
					);
				}

				const normalizedPath = normalize(resolveRequestedLocalPath(localPath));
				if (!isInsideAllowedDataPath(normalizedPath)) {
					return new Response(
						"Image path is outside the allowed data directory.",
						{ status: 403 },
					);
				}

				if (!existsSync(normalizedPath)) {
					return new Response(
						"Image file not found.",
						{ status: 404 },
					);
				}

				const extension   = extname(normalizedPath).toLowerCase();
				const contentType = CONTENT_TYPE_BY_EXTENSION[ extension ] ?? "application/octet-stream";

				return new Response(
					readFileSync(normalizedPath),
					{
						status:  200,
						headers: {
							"content-type":                contentType,
							"cache-control":               "public, max-age=31536000, immutable",
							"access-control-allow-origin": "*",
							"access-control-allow-methods": "GET",
						},
					},
				);
			} catch (error) {
				LoggerUtils.logMainInitializationError(typeSafeError(error));
				return new Response(
					"Failed to resolve local image.",
					{ status: 500 },
				);
			}
		},
	);
}
