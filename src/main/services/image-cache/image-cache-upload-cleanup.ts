import { ImageCacheDbFacade } from "@nimlat/database";
import type { UserUploadedImageEntryDto } from "@nimlat/types/anime-db";
import { resolveStoredCachePath } from "./image-cache-paths";
import {
	createUploadedCacheKey,
	deleteStaleCachedFileSafely,
} from "./image-cache-runtime";
import type { CacheImageVariant } from "./image-cache-types";

const UPLOADED_IMAGE_CACHE_VARIANTS = [
	"optimized-card",
	"full-size",
] satisfies CacheImageVariant[];

// User uploads are durable source files, while generated upload cache variants
// are rebuildable. Any path that removes an upload row must clear these variants
// too, otherwise missing-source pruning leaves unreachable cache files behind.
export function deleteUploadedImageCacheEntries(
	uploadedImage: Pick<UserUploadedImageEntryDto, "id" | "ownerKind" | "ownerId" | "imageRole">,
): void {
	UPLOADED_IMAGE_CACHE_VARIANTS.forEach((cacheVariant) => {
		const cacheKey    = createUploadedCacheKey(
			uploadedImage.id,
			uploadedImage.ownerKind,
			uploadedImage.ownerId,
			uploadedImage.imageRole,
			cacheVariant,
		);
		const cachedEntry = ImageCacheDbFacade.getByCacheKey(cacheKey);
		if (cachedEntry?.localPath) {
			deleteStaleCachedFileSafely(
				cacheKey,
				resolveStoredCachePath(cachedEntry.localPath),
			);
		}
		ImageCacheDbFacade.deleteByCacheKey(cacheKey);
	});
}
