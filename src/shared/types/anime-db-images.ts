// Image DTOs are persisted metadata only. Provider cache rows, user-local overrides,
// uploads, and active selections each have different lifecycles, so keep the row
// shapes explicit rather than collapsing them into one catch-all image contract.
export type ResolvedImageSource =
	| "user_local"
	| "broken_local"
	| "cached_local"
	| "remote";

export type DisplayImageOrientation =
	| "portrait"
	| "landscape"
	| "square";

// UI-facing resolved display image metadata.
// `imageUrl` remains the source/original field while `displayImageUrl` is what the
// renderer should actually load after local cache resolution. `displayImageFullSizeUrl`
// is intentionally separate so canvas/card views can keep using bounded cache files
// while inspection surfaces can opt into a larger local copy.
export interface ResolvedDisplayImageDto {
	displayImageUrl?: string;
	displayImageFullSizeUrl?: string;
	displayImageSource?: ResolvedImageSource;
	displayImageOrientation?: DisplayImageOrientation;
}

export type CachedImageStatus =
	| "pending"
	| "ready"
	| "failed";

export type ImageOwnerKind =
	| "media"
	| "official_group"
	| "user_group"
	| "episode";

export type ImageRole =
	| "primary"
	| "banner"
	| "thumbnail";

export type ImageGalleryRole =
	| "portrait"
	| "banner"
	| "thumbnail";

export type ImageCandidateSourceKind =
	| "provider"
	| "user_upload";

export interface CachedImageEntryDto {
	cacheKey: string;
	ownerKind: ImageOwnerKind;
	ownerId: string;
	imageRole: ImageRole;
	remoteUrl: string;
	localPath?: string | null;
	status: CachedImageStatus;
	errorMessage?: string | null;
	retryCount: number;
	createdAt: number;
	updatedAt: number;
	lastFetchedAt?: number | null;
	lastFailedAt?: number | null;
}

// App-owned user image override metadata.
// This keeps user-selected local files separate from both replaceable source DB rows
// and opportunistic provider-image cache bookkeeping.
export interface UserLocalImageEntryDto {
	ownerKind: ImageOwnerKind;
	ownerId: string;
	imageRole: ImageRole;
	localPath: string;
	createdAt: number;
	updatedAt: number;
}

// Persisted user-uploaded image asset for one owner and image role.
// These rows are append-only from the UI perspective: the product rule is
// that uploaded images remain selectable and are not manually deletable.
export interface UserUploadedImageEntryDto {
	id: number;
	ownerKind: ImageOwnerKind;
	ownerId: string;
	imageRole: ImageRole;
	localPath: string;
	createdAt: number;
	updatedAt: number;
}

// Current active image selection for one owner and role.
// Provider candidates are keyed by their original remote URL; uploaded candidates
// are keyed by the persisted upload row id.
export interface ActiveImageSelectionDto {
	ownerKind: ImageOwnerKind;
	ownerId: string;
	imageRole: ImageRole;
	sourceKind: ImageCandidateSourceKind;
	sourceValue: string;
	updatedAt: number;
}
