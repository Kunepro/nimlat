import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	deleteOwnedEpisodeImageIfPresent,
	deleteOwnedGroupImageIfPresent,
	deleteOwnedMediaImageIfPresent,
	storeEpisodeImage,
	storeGroupImage,
	storeMediaImage,
} from "../group/group-image-storage-service";
import type { OwnerTarget } from "./image-gallery-model";

export function createMediaOwnerTarget(mediaId: number): OwnerTarget {
	return {
		ownerKind:        "media",
		ownerId:          mediaId.toString(),
		storeUpload:      storeMediaImage,
		deleteOwnedImage: deleteOwnedMediaImageIfPresent,
	};
}

export function createGroupOwnerTarget(group: GroupRef): OwnerTarget {
	return {
		ownerKind:        group.source === "user" ? "user_group" : "official_group",
		ownerId:          group.groupId.toString(),
		storeUpload:      storeGroupImage,
		deleteOwnedImage: deleteOwnedGroupImageIfPresent,
	};
}

export function createEpisodeOwnerTarget(mediaId: number, episodeNumber: number): OwnerTarget {
	return {
		ownerKind:        "episode",
		ownerId:          `${ mediaId }:${ episodeNumber }`,
		storeUpload:      storeEpisodeImage,
		deleteOwnedImage: deleteOwnedEpisodeImageIfPresent,
	};
}
