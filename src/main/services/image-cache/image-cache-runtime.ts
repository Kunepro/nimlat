import { BUS_ImageCacheEntryReady } from "@nimlat/busses/main";
import {
	ImageCacheDbFacade,
	ImageGalleryDbFacade,
} from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	DisplayImageOrientation,
	ImageRole,
	ResolvedDisplayImageDto,
	ResolvedImageSource,
	UserUploadedImageEntryDto,
} from "@nimlat/types/anime-db";
import { createHash } from "node:crypto";
import {
	existsSync,
	rmSync,
} from "node:fs";
import { join } from "node:path";
import { deleteCachedImageMetadata } from "./cached-image-metadata";
import {
	BROKEN_PRIMARY_IMAGE_TOKEN,
	OPTIMIZED_IMAGE_EXTENSION,
} from "./image-cache-config";
import {
	createStoredCachePath,
	resolveStoredCachePath,
} from "./image-cache-paths";
import type {
	CacheImageVariant,
	CacheOwnerKind,
	CacheTarget,
	ResolvedOwnerTarget,
} from "./image-cache-types";

export function createResolvedDisplayImage(
	displayImageUrl: string,
	displayImageSource: ResolvedImageSource,
	displayImageOrientation?: DisplayImageOrientation,
): ResolvedDisplayImageDto {
	return {
		displayImageUrl,
		displayImageSource,
		displayImageOrientation,
	};
}

export function createBrokenOrEmptyImage(imageRole: ImageRole): ResolvedDisplayImageDto {
	if (imageRole !== "primary") {
		return {};
	}

	return createResolvedDisplayImage(
		BROKEN_PRIMARY_IMAGE_TOKEN,
		"broken_local",
	);
}

export function createRemoteCacheKey(
	ownerKind: CacheOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
	cacheVariant: CacheImageVariant = "optimized-card",
): string {
	return `${ ownerKind }:${ ownerId }:${ imageRole }:${ cacheVariant }-v1`;
}

export function createUploadedCacheKey(
	uploadId: number,
	ownerKind: CacheOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
	cacheVariant: CacheImageVariant = "optimized-card",
): string {
	return `upload:${ uploadId }:${ ownerKind }:${ ownerId }:${ imageRole }:${ cacheVariant }-v1`;
}

export function createUploadedCacheSourceToken(uploadedImage: Pick<UserUploadedImageEntryDto, "id" | "localPath">): string {
	// The cache table calls this value remoteUrl because provider downloads came first.
	// For user uploads it is a stable source token: upload id plus the app-owned full-size file path.
	return `upload:${ uploadedImage.id }:${ uploadedImage.localPath }`;
}

export function createImageCacheLocalPath(targetFolderPath: string, cacheKey: string): string {
	return join(
		targetFolderPath,
		`${ createHash("sha256").update(cacheKey).digest("hex") }${ OPTIMIZED_IMAGE_EXTENSION }`,
	);
}

export function clearBrokenActiveSelectionSafely(
	ownerKind: CacheOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
	sourceValue: string,
): void {
	try {
		ImageGalleryDbFacade.clearActiveSelection(
			ownerKind,
			ownerId,
			imageRole,
		);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.clear-broken-active-selection",
			typeSafeError(error),
			{
				ownerKind,
				ownerId,
				imageRole,
				sourceValue,
			},
		);
	}
}

export function deleteBrokenLegacyUserLocalImageSafely(
	ownerKind: CacheOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
	localPath: string,
): void {
	try {
		ImageCacheDbFacade.deleteUserLocalImage(
			ownerKind,
			ownerId,
			imageRole,
		);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.delete-broken-legacy-user-local-image",
			typeSafeError(error),
			{
				ownerKind,
				ownerId,
				imageRole,
				localPath,
			},
		);
	}
}

// Background cache downloads may finish while the app is shutting down.
// Persisting cache state must never surface as an unhandled rejection if the DB is already detached.
export function markImageCacheReadySafely(target: CacheTarget, localPath: string): void {
	try {
		ImageCacheDbFacade.markReady(
			target.cacheKey,
			createStoredCachePath(localPath),
		);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.mark-ready",
			typeSafeError(error),
			{
				cacheKey:  target.cacheKey,
				ownerKind: target.ownerKind,
				ownerId:   target.ownerId,
				localPath,
			},
		);
		return;
	}

	try {
		BUS_ImageCacheEntryReady.next({
			cacheKey:      target.cacheKey,
			ownerKind:     target.ownerKind,
			ownerId:       target.ownerId,
			imageRole:     target.imageRole,
			displayTarget: target.displayTarget,
		});
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.entry-ready-event",
			typeSafeError(error),
			{
				cacheKey:  target.cacheKey,
				ownerKind: target.ownerKind,
				ownerId:   target.ownerId,
			},
		);
	}
}

// Failure bookkeeping is best-effort only.
// If the DB is gone during shutdown, keep the original network/file error log and suppress secondary teardown faults.
export function markImageCacheFailedSafely(
	cacheKey: string,
	error: Error,
	detail: {
		ownerKind: CacheOwnerKind;
		ownerId: string;
		remoteUrl: string;
	},
): void {
	try {
		ImageCacheDbFacade.markFailed(
			cacheKey,
			error.message,
		);
	} catch (persistError) {
		LoggerUtils.logMainServiceError(
			"image-cache.mark-failed",
			typeSafeError(persistError),
			{
				cacheKey,
				...detail,
			},
		);
	}
}

// When one provider image URL rotates for the same owner/role, the previous cached file becomes unreachable.
// Delete it eagerly so cache rotation does not leak files on disk.
export function deleteStaleCachedFileSafely(cacheKey: string, localPath: string): void {
	try {
		if (existsSync(localPath)) {
			rmSync(localPath);
		}
		deleteCachedImageMetadata(localPath);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"image-cache.delete-stale-cached-file",
			typeSafeError(error),
			{
				cacheKey,
				localPath,
			},
		);
	}
}

export function pruneRotatedProviderCacheEntries(target: ResolvedOwnerTarget, activeRemoteUrl: string): void {
	const staleEntries = ImageCacheDbFacade.listByOwnerRole(
		target.ownerKind,
		target.ownerId,
		target.imageRole,
	).filter((entry) => entry.remoteUrl !== activeRemoteUrl);

	staleEntries.forEach((entry) => {
		if (entry.localPath) {
			deleteStaleCachedFileSafely(
				entry.cacheKey,
				resolveStoredCachePath(entry.localPath),
			);
		}
		ImageCacheDbFacade.deleteByCacheKey(entry.cacheKey);
	});
}
