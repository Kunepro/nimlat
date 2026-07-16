import type {
	IntegrationStatus,
	PlaybackIssueCategory,
} from "./anime-db-integration";
import type {
	GroupRef,
	MediaId,
} from "./nimlat-ids";

export interface EpisodePlaybackIssueMoment {
	playbackIssueCategory: PlaybackIssueCategory;
	timeSeconds: number;
	note?: string;
}

export interface SetEpisodeIntegrationStatusRequest {
	mediaId: MediaId;
	episodeNumber: number;
	integrationStatus: IntegrationStatus | null;
}

export interface SetEpisodeIntegrationStatusesRequest {
	mediaId: MediaId;
	episodeNumbers: number[];
	integrationStatus: IntegrationStatus | null;
}

export interface SetMediaIntegrationStatusRequest {
	mediaId: MediaId;
	integrationStatus: IntegrationStatus | null;
}

export interface SetGroupIntegrationStatusRequest {
	group: GroupRef;
	integrationStatus: IntegrationStatus | null;
}

export interface SetMediaWatchStateRequest {
	mediaIds: MediaId[];
	isWatched: boolean;
}

export interface SetEpisodeWatchStateRequest {
	mediaId: MediaId;
	episodeNumber: number;
	isWatched: boolean;
}

export interface SetEpisodeWatchStatesRequest {
	mediaId: MediaId;
	episodeNumbers: number[];
	isWatched: boolean;
}

export interface SetGroupWatchStateRequest {
	group: GroupRef;
	isWatched: boolean;
}

export interface SaveEpisodeIntegrationStateRequest {
	mediaId: MediaId;
	episodeNumber: number;
	integrationStatus: IntegrationStatus | null;
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments: EpisodePlaybackIssueMoment[];
}

export interface SaveMediaIntegrationStateRequest {
	mediaId: MediaId;
	integrationStatus: IntegrationStatus | null;
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	// Only medias without a usable child episode list should persist timed media-level
	// playback markers. Normal episodic medias keep exact timestamps on child
	// episodes; provider-empty media use this fallback until child rows exist.
	playbackIssueMoments?: EpisodePlaybackIssueMoment[];
}

export type IntegrationStatusActionResult =
	| { success: true }
	| { success: false; error: string };

export type MediaWatchStateActionResult =
	| { success: true; changedMediaIds: MediaId[] }
	| { success: false; error: string };
