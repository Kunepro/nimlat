import { getDatabase } from "../../utils/get-db";

interface UpsertCachedImagePendingParams {
	cacheKey: string;
	ownerKind: string;
	ownerId: string;
	imageRole: string;
	remoteUrl: string;
}

/**
 * Ensure one remote image is tracked as pending for local caching.
 * If the upstream URL changed, the old local path is cleared so the next successful fetch wins.
 */
export function upsertCachedImagePending(params: UpsertCachedImagePendingParams): void {
	const now = Date.now();

	// noinspection SqlResolve
	getDatabase()
		.prepare(`
        INSERT INTO image_data.cachedImages (cacheKey,
                                             ownerKind,
                                             ownerId,
                                             imageRole,
                                             remoteUrl,
                                             localPath,
                                             status,
                                             errorMessage,
                                             retryCount,
                                             createdAt,
                                             updatedAt,
                                             lastFetchedAt,
                                             lastFailedAt)
        VALUES (?, ?, ?, ?, ?, NULL, 'pending', NULL, 0, ?, ?, NULL, NULL)
        ON CONFLICT(cacheKey) DO UPDATE SET ownerKind     = excluded.ownerKind,
                                            ownerId       = excluded.ownerId,
                                            imageRole     = excluded.imageRole,
                                            remoteUrl     = excluded.remoteUrl,
                                            localPath     = CASE
                                                                WHEN image_data.cachedImages.remoteUrl = excluded.remoteUrl
                                                                    THEN image_data.cachedImages.localPath
                                                END,
                                            status        = CASE
                                                                WHEN image_data.cachedImages.remoteUrl =
                                                                     excluded.remoteUrl
                                                                    AND image_data.cachedImages.status = 'ready'
                                                                    THEN image_data.cachedImages.status
                                                                ELSE 'pending'
                                                END,
                                            errorMessage  = NULL,
                                            retryCount    = CASE
                                                                WHEN image_data.cachedImages.remoteUrl = excluded.remoteUrl
                                                                    THEN image_data.cachedImages.retryCount
                                                                ELSE 0
                                                END,
                                            updatedAt     = excluded.updatedAt,
                                            lastFetchedAt = CASE
                                                                WHEN image_data.cachedImages.remoteUrl = excluded.remoteUrl
                                                                    THEN image_data.cachedImages.lastFetchedAt
                                                END,
                                            lastFailedAt  = CASE
                                                                WHEN image_data.cachedImages.remoteUrl = excluded.remoteUrl
                                                                    THEN image_data.cachedImages.lastFailedAt
                                                END
		`)
		.run(
			params.cacheKey,
			params.ownerKind,
			params.ownerId,
			params.imageRole,
			params.remoteUrl,
			now,
			now,
		);
}
