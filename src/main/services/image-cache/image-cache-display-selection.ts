import {
	ImageCacheDbFacade,
	ImageGalleryDbFacade,
} from "@nimlat/database";
import type {
	ImageRole,
	ResolvedDisplayImageDto,
} from "@nimlat/types/anime-db";
import { existsSync } from "node:fs";
import { resolveProviderDisplayImage } from "./image-cache-provider-display";
import {
	clearBrokenActiveSelectionSafely,
	createBrokenOrEmptyImage,
	createResolvedDisplayImage,
	deleteBrokenLegacyUserLocalImageSafely,
} from "./image-cache-runtime";
import type {
	CacheImageVariant,
	CacheOwnerKind,
	ResolvedOwnerTarget,
} from "./image-cache-types";
import { resolveUploadedSelection } from "./image-cache-upload-selection";

// Resolve the active gallery selection before falling back to legacy local image
// overrides and finally provider imagery. Keeping this policy centralized protects
// cache behavior across media, group, and episode display paths.
export function resolveSelectedOrDefaultDisplayImage(
	target: ResolvedOwnerTarget,
	defaultRemoteUrl?: string,
	cacheVariant: CacheImageVariant = "optimized-card",
): ResolvedDisplayImageDto {
	const activeSelection = ImageGalleryDbFacade.getActiveSelection(
		target.ownerKind,
		target.ownerId,
		target.imageRole,
	);

	if (activeSelection?.sourceKind === "user_upload") {
		return resolveUploadedSelection(
			target,
			activeSelection.sourceValue,
			cacheVariant,
		);
	}

	if (activeSelection?.sourceKind === "provider") {
		if (isStaleEpisodeProviderSelection(
			target,
			activeSelection.sourceValue,
			defaultRemoteUrl,
		)) {
			clearBrokenActiveSelectionSafely(
				target.ownerKind,
				target.ownerId,
				target.imageRole,
				activeSelection.sourceValue,
			);
		} else {
			return resolveProviderDisplayImage(
				target,
				activeSelection.sourceValue,
				cacheVariant,
			);
		}
	}

	const legacyUserLocalImage = resolveLegacyUserLocalImage(
		target.ownerKind,
		target.ownerId,
		target.imageRole,
	);
	if (legacyUserLocalImage === "broken") {
		return createBrokenOrEmptyImage(target.imageRole);
	}
	if (legacyUserLocalImage) {
		return createResolvedDisplayImage(
			legacyUserLocalImage,
			"user_local",
		);
	}

	return resolveProviderDisplayImage(
		target,
		defaultRemoteUrl,
		cacheVariant,
	);
}

// Read the legacy single-path local override if it still exists on disk.
// Missing files are pruned from image_data so stale local selections do not linger forever.
function resolveLegacyUserLocalImage(
	ownerKind: CacheOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
): string | "broken" | undefined {
	const entry = ImageCacheDbFacade.getUserLocalImage(
		ownerKind,
		ownerId,
		imageRole,
	);
	if (!entry?.localPath) {
		return undefined;
	}

	if (!existsSync(entry.localPath)) {
		deleteBrokenLegacyUserLocalImageSafely(
			ownerKind,
			ownerId,
			imageRole,
			entry.localPath,
		);
		return "broken";
	}

	return entry.localPath;
}

function isStaleEpisodeProviderSelection(
	target: ResolvedOwnerTarget,
	selectedProviderUrl: string,
	defaultRemoteUrl?: string,
): boolean {
	// Episode thumbnails expose only one provider candidate: the current Jikan
	// thumbnail URL. If Jikan rotates that URL, an old active provider selection
	// should not pin the episode to a stale locally cached image.
	return target.ownerKind === "episode"
		&& target.imageRole === "thumbnail"
		&& Boolean(defaultRemoteUrl)
		&& selectedProviderUrl !== defaultRemoteUrl;
}
