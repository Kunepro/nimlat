import {
	PATH_EPISODE_IMAGE_CACHE,
	PATH_GROUP_IMAGE_CACHE,
	PATH_MEDIA_IMAGE_CACHE,
} from "@nimlat/constants/main/system-folders";
import type { ImageRole } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { resolveTargetFolderPath } from "./image-cache-paths";
import type {
	CacheOwnerKind,
	ResolvedOwnerTarget,
} from "./image-cache-types";

export function createMediaImageTarget(mediaId: number, imageRole: ImageRole): ResolvedOwnerTarget {
	return {
		ownerKind:        "media",
		ownerId:          mediaId.toString(),
		imageRole,
		targetFolderPath: PATH_MEDIA_IMAGE_CACHE,
		displayTarget:    {
			kind: "media",
			mediaId,
		},
	};
}

export function createGroupImageTarget(group: GroupRef, imageRole: ImageRole): ResolvedOwnerTarget {
	return {
		ownerKind:        group.source === "user" ? "user_group" : "official_group",
		ownerId:          group.groupId.toString(),
		imageRole,
		targetFolderPath: PATH_GROUP_IMAGE_CACHE,
		displayTarget:    {
			kind: "group",
			group,
		},
	};
}

export function createEpisodeImageTarget(mediaId: number, episodeNumber: number): ResolvedOwnerTarget {
	return {
		ownerKind:        "episode",
		ownerId:          `${ mediaId }:${ episodeNumber }`,
		imageRole:        "thumbnail",
		targetFolderPath: PATH_EPISODE_IMAGE_CACHE,
		displayTarget:    {
			kind: "episode",
			mediaId,
		},
	};
}

export function createGalleryCandidateImageTarget(
	ownerKind: CacheOwnerKind,
	ownerId: string,
	imageRole: ImageRole,
): ResolvedOwnerTarget {
	return {
		ownerKind,
		ownerId,
		imageRole,
		targetFolderPath: resolveTargetFolderPath(ownerKind),
		displayTarget:    { kind: "none" },
	};
}
