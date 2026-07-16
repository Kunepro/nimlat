import { LoggerUtils } from "@nimlat/loggers/main";
import {
	mkdirSync,
	writeFileSync,
} from "node:fs";
import {
	readFetchErrorDetails,
	UpstreamHttpError,
} from "../../api/http/upstream-http-error";
import { resolveOrPersistCachedImageMetadata } from "./cached-image-metadata";
import { MAX_REMOTE_DOWNLOADS } from "./image-cache-config";
import { createOptimizedImageBuffer } from "./image-cache-optimizer";
import {
	createImageCacheLocalPath,
	markImageCacheFailedSafely,
	markImageCacheReadySafely,
} from "./image-cache-runtime";
import type { CacheTarget } from "./image-cache-types";

const inFlightCacheKeys                   = new Set<string>();
const queuedCacheDownloads: CacheTarget[] = [];
let activeCacheDownloadCount              = 0;

export function scheduleImageCacheDownload(target: CacheTarget): void {
	if (inFlightCacheKeys.has(target.cacheKey)) {
		return;
	}

	inFlightCacheKeys.add(target.cacheKey);
	queuedCacheDownloads.push(target);
	pumpDownloadQueue();
}

function pumpDownloadQueue(): void {
	// Library rows can ask for many provider images in one render pass. Limit
	// only remote HTTP work; ready local cache hits still resolve synchronously.
	while (activeCacheDownloadCount < MAX_REMOTE_DOWNLOADS && queuedCacheDownloads.length > 0) {
		const target = queuedCacheDownloads.shift();
		if (!target) {
			return;
		}

		activeCacheDownloadCount += 1;
		void downloadAndPersist(target).finally(() => {
			activeCacheDownloadCount -= 1;
			inFlightCacheKeys.delete(target.cacheKey);
			pumpDownloadQueue();
		});
	}
}

async function downloadAndPersist(target: CacheTarget): Promise<void> {
	try {
		const response = await fetch(target.remoteUrl);
		if (!response.ok) {
			throw new UpstreamHttpError(
				`Image cache download failed with HTTP ${ response.status } for ${ target.remoteUrl }`,
				response.status,
				await readFetchErrorDetails(
					response,
					target.remoteUrl,
				),
			);
		}

		const buffer = createOptimizedImageBuffer(
			Buffer.from(await response.arrayBuffer()),
			target.imageRole,
			target.cacheVariant,
		);
		mkdirSync(
			target.targetFolderPath,
			{ recursive: true },
		);
		const localPath = createImageCacheLocalPath(
			target.targetFolderPath,
			target.cacheKey,
		);
		writeFileSync(
			localPath,
			buffer,
		);
		resolveOrPersistCachedImageMetadata(localPath);

		markImageCacheReadySafely(
			target,
			localPath,
		);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		markImageCacheFailedSafely(
			target.cacheKey,
			typedError,
			{
				ownerKind: target.ownerKind,
				ownerId:   target.ownerId,
				remoteUrl: target.remoteUrl,
			},
		);
		LoggerUtils.logMainServiceError(
			"image-cache.download-and-persist",
			typedError,
			{
				cacheKey:  target.cacheKey,
				ownerKind: target.ownerKind,
				ownerId:   target.ownerId,
				remoteUrl: target.remoteUrl,
			},
		);
	}
}
