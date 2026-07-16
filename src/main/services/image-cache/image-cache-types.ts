import type { ImageDisplayTarget } from "@nimlat/busses/main";
import type {
	ImageOwnerKind,
	ImageRole,
} from "@nimlat/types/anime-db";

export type CacheOwnerKind = ImageOwnerKind;
export type CacheImageVariant = "optimized-card" | "full-size";

export type CacheTarget = {
	cacheKey: string;
	ownerKind: CacheOwnerKind;
	ownerId: string;
	imageRole: ImageRole;
	cacheVariant: CacheImageVariant;
	remoteUrl: string;
	targetFolderPath: string;
	displayTarget: ImageDisplayTarget;
};

export type ResolvedOwnerTarget = {
	ownerKind: CacheOwnerKind;
	ownerId: string;
	imageRole: ImageRole;
	targetFolderPath: string;
	displayTarget: ImageDisplayTarget;
};
