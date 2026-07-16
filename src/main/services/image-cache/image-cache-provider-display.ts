import { ImageCacheDbFacade } from "@nimlat/database";
import type { ResolvedDisplayImageDto } from "@nimlat/types/anime-db";
import { existsSync } from "node:fs";
import { NetworkStatusReadService } from "../network/network-status-read-service";
import { resolveOrPersistCachedImageMetadata } from "./cached-image-metadata";
import { FAILED_RETRY_COOLDOWN_MS } from "./image-cache-config";
import { scheduleImageCacheDownload } from "./image-cache-download-queue";
import {
	isLocalImagePath,
	isRemoteImageUrl,
	resolveStoredCachePath,
} from "./image-cache-paths";
import {
	createRemoteCacheKey,
	createResolvedDisplayImage,
	deleteStaleCachedFileSafely,
	pruneRotatedProviderCacheEntries,
} from "./image-cache-runtime";
import type {
	CacheImageVariant,
	ResolvedOwnerTarget,
} from "./image-cache-types";

export function resolveProviderDisplayImage(
	target: ResolvedOwnerTarget,
	remoteUrl?: string,
	cacheVariant: CacheImageVariant = "optimized-card",
): ResolvedDisplayImageDto {
	if (!remoteUrl) {
		return {};
	}

	if (isLocalImagePath(remoteUrl) || remoteUrl.startsWith("file:")) {
		return createResolvedDisplayImage(
			remoteUrl,
			"user_local",
		);
	}

	if (!isRemoteImageUrl(remoteUrl)) {
		return createResolvedDisplayImage(
			remoteUrl,
			"remote",
		);
	}

	const cacheKey = createRemoteCacheKey(
		target.ownerKind,
		target.ownerId,
		target.imageRole,
		cacheVariant,
	);
	pruneRotatedProviderCacheEntries(
		target,
		remoteUrl,
	);
	const cachedEntry = ImageCacheDbFacade.getByCacheKey(cacheKey);
	if (cachedEntry?.remoteUrl && cachedEntry.remoteUrl !== remoteUrl && cachedEntry.localPath) {
		deleteStaleCachedFileSafely(
			cacheKey,
			resolveStoredCachePath(cachedEntry.localPath),
		);
	}
	if (cachedEntry
		&& cachedEntry.remoteUrl === remoteUrl
		&& cachedEntry.status === "ready"
		&& cachedEntry.localPath) {
		const localPath = resolveStoredCachePath(cachedEntry.localPath);
		if (existsSync(localPath)) {
			const metadata = resolveOrPersistCachedImageMetadata(localPath);
			return createResolvedDisplayImage(
				localPath,
				"cached_local",
				metadata?.orientation,
			);
		}
	}

	ImageCacheDbFacade.ensurePending({
		cacheKey,
		ownerKind: target.ownerKind,
		ownerId:   target.ownerId,
		imageRole: target.imageRole,
		remoteUrl,
	});
	if (shouldScheduleProviderDownload(
		cachedEntry,
		remoteUrl,
	)) {
		scheduleImageCacheDownload({
			cacheKey,
			ownerKind:        target.ownerKind,
			ownerId:          target.ownerId,
			imageRole:        target.imageRole,
			cacheVariant,
			remoteUrl,
			targetFolderPath: target.targetFolderPath,
			displayTarget:    target.displayTarget,
		});
	}

	return createResolvedDisplayImage(
		remoteUrl,
		"remote",
	);
}

function shouldScheduleProviderDownload(
	cachedEntry: ReturnType<typeof ImageCacheDbFacade.getByCacheKey>,
	remoteUrl: string,
): boolean {
	if (!NetworkStatusReadService.isOnline()) {
		return false;
	}

	if (!cachedEntry) {
		return true;
	}

	if (cachedEntry.remoteUrl !== remoteUrl) {
		return true;
	}

	if (cachedEntry.status === "ready" && cachedEntry.localPath && existsSync(resolveStoredCachePath(cachedEntry.localPath))) {
		return false;
	}

	if (cachedEntry.status === "failed" && typeof cachedEntry.lastFailedAt === "number") {
		return Date.now() - cachedEntry.lastFailedAt >= FAILED_RETRY_COOLDOWN_MS;
	}

	return true;
}
