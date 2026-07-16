import { getDatabase } from "../../utils/get-db";

/**
 * Persist one successfully downloaded local cache path.
 */
export function markCachedImageReady(cacheKey: string, localPath: string): void {
	const now = Date.now();

	// noinspection SqlResolve
	getDatabase()
		.prepare(`
        UPDATE image_data.cachedImages
        SET localPath     = ?,
            status        = 'ready',
            errorMessage  = NULL,
            updatedAt     = ?,
            lastFetchedAt = ?,
            lastFailedAt  = NULL
        WHERE cacheKey = ?
		`)
		.run(
			localPath,
			now,
			now,
			cacheKey,
		);
}
