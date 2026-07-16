import { ImageCacheDbFacade } from "@nimlat/database";
import type {
	ImageRole,
	ResolvedDisplayImageDto,
	UserUploadedImageEntryDto,
} from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { existsSync } from "node:fs";
import { resolveSelectedOrDefaultDisplayImage } from "./image-cache-display-selection";
import {
	createEpisodeImageTarget,
	createGalleryCandidateImageTarget,
	createGroupImageTarget,
	createMediaImageTarget,
} from "./image-cache-owner-targets";
import { resolveProviderDisplayImage } from "./image-cache-provider-display";
import {
	createBrokenOrEmptyImage,
	createResolvedDisplayImage,
} from "./image-cache-runtime";
import type { CacheOwnerKind } from "./image-cache-types";
import { deleteUploadedImageCacheEntries } from "./image-cache-upload-cleanup";

// Resolve display images with offline-capable local cache fallbacks.
//
// Core rules:
// - active user-uploaded selections win
// - active provider selections resolve through the local cache layer
// - legacy single-path user local overrides are still honored as fallback until the gallery path fully replaces them
// - source/original image fields stay untouched; the cache only produces renderer display metadata
// - cache bookkeeping belongs in image_data, never anime_data, because admin-built Anime DB files are distributable
export class ImageCacheService {
	public static resolveMediaDisplayImage(mediaId: number, imageUrl?: string): ResolvedDisplayImageDto {
		return resolveSelectedOrDefaultDisplayImage(
			createMediaImageTarget(
				mediaId,
				"primary",
			),
			imageUrl,
		);
	}

	public static resolveMediaInspectionDisplayImage(mediaId: number, imageUrl?: string): ResolvedDisplayImageDto {
		const optimizedImage = this.resolveMediaDisplayImage(
			mediaId,
			imageUrl,
		);
		const fullSizeImage = resolveSelectedOrDefaultDisplayImage(
			createMediaImageTarget(
				mediaId,
				"primary",
			),
			imageUrl,
			"full-size",
		);

		return {
			...optimizedImage,
			displayImageFullSizeUrl: fullSizeImage.displayImageUrl ?? optimizedImage.displayImageUrl,
		};
	}

	public static resolveMediaBannerDisplayImage(mediaId: number, imageUrl?: string): ResolvedDisplayImageDto {
		return resolveSelectedOrDefaultDisplayImage(
			createMediaImageTarget(
				mediaId,
				"banner",
			),
			imageUrl,
		);
	}

	public static resolveGroupDisplayImage(group: GroupRef, imageUrl?: string): ResolvedDisplayImageDto {
		return resolveSelectedOrDefaultDisplayImage(
			createGroupImageTarget(
				group,
				"primary",
			),
			imageUrl,
		);
	}

	public static resolveGroupBannerDisplayImage(group: GroupRef, imageUrl?: string): ResolvedDisplayImageDto {
		return resolveSelectedOrDefaultDisplayImage(
			createGroupImageTarget(
				group,
				"banner",
			),
			imageUrl,
		);
	}

	public static resolveEpisodeDisplayImage(mediaId: number, episodeNumber: number, imageUrl?: string): ResolvedDisplayImageDto {
		return resolveSelectedOrDefaultDisplayImage(
			createEpisodeImageTarget(
				mediaId,
				episodeNumber,
			),
			imageUrl,
		);
	}

	// Resolve one provider-backed gallery candidate through the local image cache.
	// This does not consult active selections; it only resolves the supplied source candidate.
	public static resolveProviderGalleryCandidate(
		ownerKind: CacheOwnerKind,
		ownerId: string,
		imageRole: ImageRole,
		remoteUrl?: string,
	): ResolvedDisplayImageDto {
		return resolveProviderDisplayImage(
			createGalleryCandidateImageTarget(
				ownerKind,
				ownerId,
				imageRole,
			),
			remoteUrl,
		);
	}

	// Resolve one uploaded gallery candidate directly from disk for preview rendering.
	public static resolveUploadedGalleryCandidate(localPath?: string): ResolvedDisplayImageDto {
		if (!localPath) {
			return {};
		}

		if (!existsSync(localPath)) {
			return createBrokenOrEmptyImage("primary");
		}

		return createResolvedDisplayImage(
			localPath,
			"user_local",
		);
	}

	public static saveGroupUserLocalImage(group: GroupRef, localPath: string): void {
		ImageCacheDbFacade.saveUserLocalImage({
			ownerKind: group.source === "user" ? "user_group" : "official_group",
			ownerId:   group.groupId.toString(),
			imageRole: "primary",
			localPath,
		});
	}

	public static deleteGroupUserLocalImage(group: GroupRef): void {
		ImageCacheDbFacade.deleteUserLocalImage(
			group.source === "user" ? "user_group" : "official_group",
			group.groupId.toString(),
			"primary",
		);
	}

	public static saveMediaUserLocalImage(mediaId: number, localPath: string): void {
		ImageCacheDbFacade.saveUserLocalImage({
			ownerKind: "media",
			ownerId:   mediaId.toString(),
			imageRole: "primary",
			localPath,
		});
	}

	public static deleteMediaUserLocalImage(mediaId: number): void {
		ImageCacheDbFacade.deleteUserLocalImage(
			"media",
			mediaId.toString(),
			"primary",
		);
	}

	public static deleteUploadedImageCache(
		uploadedImage: Pick<UserUploadedImageEntryDto, "id" | "ownerKind" | "ownerId" | "imageRole">,
	): void {
		deleteUploadedImageCacheEntries(uploadedImage);
	}

}
