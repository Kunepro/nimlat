import {
	ImageCacheDbFacade,
	ImageGalleryDbFacade,
} from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	ResolvedDisplayImageDto,
	UserUploadedImageEntryDto,
} from "@nimlat/types/anime-db";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { resolveOrPersistCachedImageMetadata } from "./cached-image-metadata";
import { createOptimizedImageBuffer } from "./image-cache-optimizer";
import { resolveStoredCachePath } from "./image-cache-paths";
import {
	clearBrokenActiveSelectionSafely,
	createBrokenOrEmptyImage,
	createImageCacheLocalPath,
	createResolvedDisplayImage,
	createUploadedCacheKey,
	createUploadedCacheSourceToken,
	deleteStaleCachedFileSafely,
	markImageCacheFailedSafely,
	markImageCacheReadySafely,
} from "./image-cache-runtime";
import type {
	CacheImageVariant,
	CacheTarget,
	ResolvedOwnerTarget,
} from "./image-cache-types";
import { deleteUploadedImageCacheEntries } from "./image-cache-upload-cleanup";

// Resolve the currently active uploaded image selection.
// Broken uploaded files are pruned from both the upload list and the active selection.
export function resolveUploadedSelection(
	target: ResolvedOwnerTarget,
	sourceValue: string,
	cacheVariant: CacheImageVariant = "optimized-card",
): ResolvedDisplayImageDto {
	const uploadId = Number(sourceValue);
	if (!Number.isFinite(uploadId)) {
		clearBrokenActiveSelectionSafely(
			target.ownerKind,
			target.ownerId,
			target.imageRole,
			sourceValue,
		);
		return createBrokenOrEmptyImage(target.imageRole);
	}

	const uploadedImage = ImageGalleryDbFacade.getUploadedImageById(uploadId);
	if (!uploadedImage
		|| uploadedImage.ownerKind !== target.ownerKind
		|| uploadedImage.ownerId !== target.ownerId
		|| uploadedImage.imageRole !== target.imageRole) {
		clearBrokenActiveSelectionSafely(
			target.ownerKind,
			target.ownerId,
			target.imageRole,
			sourceValue,
		);
		return createBrokenOrEmptyImage(target.imageRole);
	}

	if (!uploadedImage.localPath || !existsSync(uploadedImage.localPath)) {
		deleteUploadedImageCacheEntries(uploadedImage);
		ImageGalleryDbFacade.deleteUploadedImageById(uploadId);
		clearBrokenActiveSelectionSafely(
			target.ownerKind,
			target.ownerId,
			target.imageRole,
			sourceValue,
		);
		return createBrokenOrEmptyImage(target.imageRole);
	}

	if (cacheVariant === "full-size") {
		// User uploads are already copied into app-owned storage at original size.
		// Keep that source as the inspection asset and derive only bounded display variants.
		return createResolvedDisplayImage(
			uploadedImage.localPath,
			"user_local",
		);
	}

	return resolveUploadedOptimizedDisplayImage(
		target,
		uploadedImage,
	);
}

function resolveUploadedOptimizedDisplayImage(
	target: ResolvedOwnerTarget,
	uploadedImage: UserUploadedImageEntryDto,
): ResolvedDisplayImageDto {
	const cacheKey    = createUploadedCacheKey(
		uploadedImage.id,
		target.ownerKind,
		target.ownerId,
		target.imageRole,
		"optimized-card",
	);
	const sourceToken = createUploadedCacheSourceToken(uploadedImage);
	const cachedEntry = ImageCacheDbFacade.getByCacheKey(cacheKey);
	if (cachedEntry?.remoteUrl && cachedEntry.remoteUrl !== sourceToken && cachedEntry.localPath) {
		deleteStaleCachedFileSafely(
			cacheKey,
			resolveStoredCachePath(cachedEntry.localPath),
		);
	}
	if (cachedEntry
		&& cachedEntry.remoteUrl === sourceToken
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

	const cacheTarget: CacheTarget = {
		cacheKey,
		ownerKind:        target.ownerKind,
		ownerId:          target.ownerId,
		imageRole:        target.imageRole,
		cacheVariant:     "optimized-card",
		remoteUrl:        sourceToken,
		targetFolderPath: target.targetFolderPath,
		displayTarget:    target.displayTarget,
	};

	try {
		ImageCacheDbFacade.ensurePending({
			cacheKey,
			ownerKind: target.ownerKind,
			ownerId:   target.ownerId,
			imageRole: target.imageRole,
			remoteUrl: sourceToken,
		});
		const buffer = createOptimizedImageBuffer(
			readFileSync(uploadedImage.localPath),
			target.imageRole,
			"optimized-card",
		);
		mkdirSync(
			target.targetFolderPath,
			{ recursive: true },
		);
		const localPath = createImageCacheLocalPath(
			target.targetFolderPath,
			cacheKey,
		);
		writeFileSync(
			localPath,
			buffer,
		);
		const metadata = resolveOrPersistCachedImageMetadata(localPath);
		markImageCacheReadySafely(
			cacheTarget,
			localPath,
		);
		return createResolvedDisplayImage(
			localPath,
			"cached_local",
			metadata?.orientation,
		);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		markImageCacheFailedSafely(
			cacheKey,
			typedError,
			{
				ownerKind: target.ownerKind,
				ownerId:   target.ownerId,
				remoteUrl: sourceToken,
			},
		);
		LoggerUtils.logMainServiceError(
			"image-cache.resolve-uploaded-optimized-display-image",
			typedError,
			{
				cacheKey,
				ownerKind: target.ownerKind,
				ownerId:   target.ownerId,
				localPath: uploadedImage.localPath,
			},
		);
		return createResolvedDisplayImage(
			uploadedImage.localPath,
			"user_local",
		);
	}
}
