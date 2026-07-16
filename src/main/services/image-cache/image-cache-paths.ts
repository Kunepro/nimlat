import {
	PATH_DATA,
	PATH_EPISODE_IMAGE_CACHE,
	PATH_GROUP_IMAGE_CACHE,
	PATH_MEDIA_IMAGE_CACHE,
} from "@nimlat/constants/main/system-folders";
import {
	isAbsolute,
	join,
	relative,
} from "node:path";
import type { CacheOwnerKind } from "./image-cache-types";

export function isRemoteImageUrl(imageUrl: string): boolean {
	return /^(https?:)?\/\//i.test(imageUrl);
}

export function isLocalImagePath(imageUrl: string): boolean {
	return !isRemoteImageUrl(imageUrl) && !imageUrl.startsWith("data:");
}

export function resolveTargetFolderPath(ownerKind: CacheOwnerKind): string {
	if (ownerKind === "episode") {
		return PATH_EPISODE_IMAGE_CACHE;
	}

	if (ownerKind === "media") {
		return PATH_MEDIA_IMAGE_CACHE;
	}

	return PATH_GROUP_IMAGE_CACHE;
}

export function resolveStoredCachePath(localPath: string): string {
	return isAbsolute(localPath)
		? localPath
		: join(
			PATH_DATA,
			localPath,
		);
}

export function createStoredCachePath(localPath: string): string {
	const relativePath = relative(
		PATH_DATA,
		localPath,
	);

	// Provider cache files are app-owned and should be portable with image_data.
	// If a future caller passes an out-of-data path, keep it absolute rather than
	// inventing a relative path that points outside the app data boundary.
	return relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)
		? relativePath.replaceAll(
			"\\",
			"/",
		)
		: localPath;
}
