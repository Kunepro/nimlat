import type { MediaStatus } from "./ani-list-media-api";
import type {
	AniListMediaId,
	MalMediaId,
	MediaId,
} from "./nimlat-ids";

// Hydration and updater DTOs describe queue rows plus the bounded support facts
// exposed to services/UI. Queue status values are persisted strings, so changing
// their meaning requires an approved migration path.
export interface AniListInsertErrorLogDto {
	id: number;
	idAniList?: MediaId;
	payload: string;
	errorMsg: string;
	occurredAt: number;
	status?: string;
	retryCount?: number;
}

export interface MediaCharactersQueueDto {
	mediaId: number;
	lastTriedAt?: number;
	errorMessage?: string;
	retryCount?: number;
	status?: string;
}

export interface MediaStaffQueueDto {
	mediaId: number;
	lastTriedAt?: number;
	errorMessage?: string;
	retryCount?: number;
	status?: string;
}

export interface MediaJikanEpisodesQueueDto {
	mediaId: number;
	lastTriedAt?: number;
	errorMessage?: string;
	failureReason?: MediaEpisodeUpdatesIssueReason | null;
	retryCount?: number;
	status?: string;
}

export interface MediaJikanEpisodeThumbnailsQueueDto {
	mediaId: number;
	lastTriedAt?: number;
	errorMessage?: string;
	failureReason?: MediaEpisodeUpdatesIssueReason | null;
	retryCount?: number;
	status?: string;
	lastPage: number;
	hasNextPage: boolean;
	priority?: number;
	requestedAt?: number;
}

// Last successful Jikan /episodes coverage result for one media. Episode rows
// alone cannot represent "provider answered successfully with no episodes".
export type JikanEpisodesCoverageStatus =
	| "available"
	| "empty";

// Structured renderer-facing reason for why Jikan episode enrichment is unavailable or blocked.
// This is intentionally explicit so UI code does not parse raw queue error strings.
export type MediaEpisodeUpdatesIssueReason =
	| "network_unavailable"
	| "missing_mal_id"
	| "jikan_resource_unavailable"
	| "episode_video_thumbnails_unavailable"
	| "transient_failure";

// Minimal support facts needed to explain Jikan episode enrichment availability for one media.
// Main-process services derive user-facing status from these facts plus queue/connectivity state.
export interface MediaEpisodeUpdatesSupportFactsDto {
	mediaId: number;
	episodesCount?: number | null;
	hydratedEpisodesCount: number;
	hydratedEpisodesWithThumbnailCount: number;
	jikanEpisodesCoverageStatus?: JikanEpisodesCoverageStatus | null;
	jikanEpisodesProviderEpisodeCount?: number | null;
}

export interface MediaAdHocRefreshFactsDto {
	mediaId: MediaId;
	idAniList?: AniListMediaId | null;
	idMal?: MalMediaId | null;
	status?: MediaStatus | null;
	episodesCount?: number | null;
	nextAiringEpisode?: number | null;
	nextAiringEpisodeJson?: string | null;
	lastUpdatedAt?: number | null;
	hydratedEpisodesCount: number;
	jikanEpisodesQueueStatus?: string | null;
	jikanEpisodesFailureReason?: MediaEpisodeUpdatesIssueReason | null;
	jikanEpisodesCoverageStatus?: JikanEpisodesCoverageStatus | null;
	jikanEpisodesProviderEpisodeCount?: number | null;
}

export interface JikanEpisodesSyncStateDto {
	mediaId: number;
	syncRunId: string;
	phase: "episodes" | "synopses" | "finalize";
	lastEpisodesPage: number;
	hasNextEpisodesPage: boolean;
	lastSynopsisEpisodeNumber: number;
	hasNextSynopsisEpisode: boolean;
	startedAt: number;
	updatedAt: number;
}

export interface AnimeDbScanStateDto {
	settingValue: string;
}
