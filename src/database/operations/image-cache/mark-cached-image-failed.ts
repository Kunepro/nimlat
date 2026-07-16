import { getDatabase } from "../../utils/get-db";

/**
 * Persist one failed cache attempt so repeated reads can back off instead of retrying immediately.
 */
export function markCachedImageFailed(cacheKey: string, errorMessage: string): void {
	const now = Date.now();

	// noinspection SqlResolve
	getDatabase()
		.prepare(`
        UPDATE image_data.cachedImages
        SET status       = 'failed',
            errorMessage = ?,
            retryCount   = retryCount + 1,
            updatedAt    = ?,
            lastFailedAt = ?
        WHERE cacheKey = ?
		`)
		.run(
			errorMessage,
			now,
			now,
			cacheKey,
		);
}
