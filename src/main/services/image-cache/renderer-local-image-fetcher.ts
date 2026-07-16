import { PATH_DATA } from "@nimlat/constants/main/system-folders";
import type {
	RendererImageFetchResponse,
	RendererLocalImageFetchRequest,
} from "@nimlat/types/ipc-payloads";
import {
	existsSync,
	readFileSync,
} from "node:fs";
import {
	isAbsolute,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import {
	getLocalImageContentType,
	MAX_RENDERER_IMAGE_BYTES,
	toExactArrayBuffer,
} from "./renderer-image-response";

function resolveRequestedLocalPath(rawPath: string): string {
	if (rawPath.startsWith("file:")) {
		return fileURLToPath(rawPath);
	}

	return isAbsolute(rawPath)
		? rawPath
		: join(
			PATH_DATA,
			rawPath,
		);
}

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

// Local renderer images are restricted to app data so a compromised renderer
// cannot use the image bridge as an arbitrary filesystem read primitive.
export function fetchRendererLocalImage(request: RendererLocalImageFetchRequest): RendererImageFetchResponse {
	const localPath = resolve(resolveRequestedLocalPath(request.localPath));
	if (!isInsideAllowedDataPath(localPath)) {
		throw new Error("Only app data image files can be fetched through the local image bridge.");
	}
	if (!existsSync(localPath)) {
		throw new Error(`Local renderer image file not found: ${ localPath }`);
	}

	const bytes = readFileSync(localPath);
	if (bytes.byteLength > MAX_RENDERER_IMAGE_BYTES) {
		throw new Error(`Local renderer image bridge rejected oversized image ${ localPath }.`);
	}

	return {
		bytes:       toExactArrayBuffer(bytes),
		contentType: getLocalImageContentType(localPath),
	};
}
