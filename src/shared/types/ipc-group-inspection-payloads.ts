import type { ResolvedImageSource } from "./anime-db-images";
import type { IntegrationStatus } from "./anime-db-integration";
import type {
	MediaWallLoadedRange,
	MediaWallRangeRequest,
} from "./media-wall";
import type {
	GroupRef,
	MediaId,
} from "./nimlat-ids";

export interface GroupInspectionMediaCard {
	mediaId: MediaId;
	name: string;
	format?: string;
	description?: string;
	imageUrl?: string;
	displayImageUrl?: string;
	displayImageSource?: ResolvedImageSource;
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	isWatched?: boolean;
	isAdult?: boolean;
	hasPlaybackIssue?: boolean;
	lastRefresh: string;
	hasHydrationIssue?: boolean;
	isFilm: boolean;
}

export interface GroupMediaWallRangeRequest extends MediaWallRangeRequest {
	group: GroupRef;
}

export type GroupMediaWallRange = MediaWallLoadedRange<GroupInspectionMediaCard>;

export interface GroupInspectionSummary {
	groupId: number;
	name: string;
	description?: string;
	imageUrl?: string;
	displayImageUrl?: string;
	displayImageSource?: ResolvedImageSource;
	bannerImageUrl?: string;
	displayBannerImageUrl?: string;
	displayBannerImageSource?: ResolvedImageSource;
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	mediasCount: number;
	watchedMediasCount: number;
}

export interface GroupMediaListChangedEvent {
	groups?: GroupRef[];
	affectedMediaIds: MediaId[];
}

export interface GroupMediaItemsPatchedEvent {
	group?: GroupRef;
	patches: Array<Pick<GroupInspectionMediaCard, "mediaId"> & Partial<Omit<GroupInspectionMediaCard, "mediaId">>>;
}
