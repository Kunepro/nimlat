import {
	CachedImageEntryDto,
	ImageOwnerKind,
	ImageRole,
} from "@nimlat/types/anime-db";
import { getDatabase } from "../../utils/get-db";

// Read cache rows sharing one logical image slot. Provider cache keys include
// the remote URL hash, so owner/role lookup is required to prune rotated URLs.
export function selectCachedImageEntriesByOwnerRole(
	ownerKind: ImageOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
): CachedImageEntryDto[] {
	return getDatabase()
		// noinspection SqlResolve
		.prepare<[ ImageOwnerKind, string, ImageRole ], CachedImageEntryDto>(`
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
      WHERE ownerKind = ?
        AND ownerId = ?
        AND imageRole = ?
		`)
		.all(
			ownerKind,
			ownerId,
			imageRole,
		);
}
