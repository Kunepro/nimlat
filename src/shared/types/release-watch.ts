import type {
	MediaFormat,
	MediaStatus,
} from "./ani-list-media-api";
import type { IntegrationStatus } from "./anime-db-integration";
import type { MediaId } from "./nimlat-ids";

export type ReleaseDatePrecision =
	| "timestamp"
	| "date"
	| "month"
	| "year"
	| "unknown";

export type ReleaseDateSource =
	| "next_airing_episode"
	| "media_start_date"
	| "provider_release_at"
	| "none";

export interface ResolvedReleaseDate {
	resolvedReleaseAt: number | null;
	releaseDatePrecision: ReleaseDatePrecision;
	releaseDateSource: ReleaseDateSource;
}

export type ReleaseWatchDomain =
	| "past"
	| "upcoming";

export type ReleaseWatchScopeFilter =
	| "tracked"
	| "all";

export type PastReleaseWatchState =
	| "released_catalog"
	| "released_refresh_pending"
	| "released_retry_scheduled"
	| "released_needs_integration"
	| "resolved_hidden";

export type UpcomingReleaseWatchState =
	| "upcoming_episode_release"
	| "upcoming_media_release"
	| "resolved_hidden";

export type ReleaseWatchState =
	| PastReleaseWatchState
	| UpcomingReleaseWatchState;

export type ReleaseWatchReason = "release_window";

export type ScheduledMediaRefreshOutcome =
	| "pending"
	| "refreshed_no_change"
	| "refreshed_changed"
	| "retry_exhausted"
	| "obsolete"
	| "failed";

export type ReleaseWatchPayload = Record<string, unknown>;

export interface ReleaseWatchListChangedEvent {
	affectedMediaIds?: MediaId[];
}

interface ReleaseWatchRowBase {
	mediaId: MediaId;
	name: string;
	format?: MediaFormat | null;
	resolvedReleaseAt: number | null;
	releaseDatePrecision: ReleaseDatePrecision;
	releaseDateSource: ReleaseDateSource;
	integrationStatus?: IntegrationStatus | null;
	integrationPercent?: number | null;
	payload?: ReleaseWatchPayload;
	updatedAt: number;
}

export interface PastReleaseWatchRow extends ReleaseWatchRowBase {
	watchDomain: "past";
	state: PastReleaseWatchState;
}

export interface UpcomingReleaseWatchRow extends ReleaseWatchRowBase {
	watchDomain: "upcoming";
	state: UpcomingReleaseWatchState;
}

export interface PastReleaseWatchPage {
	items: PastReleaseWatchRow[];
	nextOffset: number | null;
	total: number;
}

export interface UpcomingReleaseWatchPage {
	items: UpcomingReleaseWatchRow[];
	nextOffset: number | null;
	total: number;
}

export interface GroupReleaseTimelineRow {
	mediaId: MediaId;
	name: string;
	format?: MediaFormat | null;
	status?: MediaStatus | null;
	resolvedReleaseAt: number | null;
	releaseDatePrecision: ReleaseDatePrecision;
	releaseDateSource: ReleaseDateSource;
	nextAiringEpisodeNumber?: number | null;
	nextAiringEpisodeAt?: number | null;
	integrationStatus?: IntegrationStatus | null;
	integrationPercent?: number | null;
}

export interface ReleaseDateResolverInput {
	nextAiringEpisode?: {
		airingAt?: number | null;
	} | null;
	startDate?: {
		year?: number | null;
		month?: number | null;
		day?: number | null;
	} | null;
	providerReleaseAt?: number | null;
}
