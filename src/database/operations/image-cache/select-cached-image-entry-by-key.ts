import { CachedImageEntryDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

/**
 * Read one cached-image bookkeeping row by its deterministic cache key.
 */
export function selectCachedImageEntryByKey(cacheKey: string): CachedImageEntryDto | null {
	const row = getDatabase()
		// noinspection SqlResolve
		.prepare<[ string ], CachedImageEntryDto>(`
      SELECT cacheKey,
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
             lastFailedAt
      FROM image_data.cachedImages
      WHERE cacheKey = ?
		`)
		.get(cacheKey);

	return row ?? null;
}
