import type {
	JikanEpisodesCoverageStatus,
	MediaEpisodeUpdatesIssueReason,
} from "./anime-db-hydration";
import type { ResolvedImageSource } from "./anime-db-images";
import type { IntegrationStatus } from "./anime-db-integration";
import type { DownloadSearchMediaTitleOptions } from "./download-search";
import type { EpisodePlaybackIssueMoment } from "./ipc-integration-payloads";
import type {
	AniListMediaId,
	GroupRef,
	MalMediaId,
	MediaId,
} from "./nimlat-ids";

export interface MediaInspectionGroupCard {
	groupId: number;
	source: GroupRef["source"];
	name: string;
	imageUrl?: string | null;
	displayImageUrl?: string;
	displayImageSource?: ResolvedImageSource;
}

export interface MediaEpisodeInspectionRow {
	mediaId: MediaId;
	episodeNumber: number;
	isWatched?: boolean;
	name?: string;
	description?: string;
	aired?: string;
	duration?: number | null;
	score?: number | null;
	filler?: boolean;
	recap?: string;
	thumbnail?: string;
	displayThumbnailUrl?: string;
	displayThumbnailSource?: ResolvedImageSource;
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments?: EpisodePlaybackIssueMoment[];
}

export interface MediaInspectionOptions {
	includeEpisodes?: boolean;
	groupSource?: GroupRef["source"];
}

export interface MediaTagSummary {
	name: string;
	category?: string;
	rank?: number;
}

export interface MediaNextAiringEpisodeSummary {
	episode: number;
	airingAt: number;
	timeUntilAiring?: number;
}

export interface MediaEpisodesListChangedEvent {
	mediaId: MediaId;
}

export interface MediaEpisodesItemsPatchedEvent {
	mediaId: MediaId;
	patches: Array<
		Pick<MediaEpisodeInspectionRow, "episodeNumber">
		& Partial<Omit<MediaEpisodeInspectionRow, "episodeNumber">>
	>;
}

export interface MediaEpisodeUpdatesIssue {
	mediaId: MediaId;
	status?: "pending" | "processing" | "failed" | "unsupported";
	reason?: MediaEpisodeUpdatesIssueReason;
	errorMessage?: string;
	retryCount: number;
	lastTriedAt?: number;
}

export type RetryMediaEpisodeUpdatesResult =
	| { success: true }
	| { success: false; error: string };

export interface MediaInspectionData {
	mediaId: MediaId;
	idAniList?: AniListMediaId | null;
	idMal?: MalMediaId | null;
	name: string;
	titleOptions?: DownloadSearchMediaTitleOptions;
	format?: string;
	description?: string;
	imageUrl?: string;
	displayImageUrl?: string;
	displayImageFullSizeUrl?: string;
	displayImageSource?: ResolvedImageSource;
	bannerImage?: string;
	displayBannerImageUrl?: string;
	displayBannerImageSource?: ResolvedImageSource;
	status?: string;
	startDate?: string;
	endDate?: string;
	season?: string;
	seasonYear?: number;
	countryOfOrigin?: string;
	source?: string;
	episodesCount?: number;
	averageScore?: number;
	meanScore?: number;
	popularity?: number;
	isAdult?: boolean;
	genres?: string[];
	tags?: MediaTagSummary[];
	nextAiringEpisode?: MediaNextAiringEpisodeSummary;
	jikanEpisodesCoverageStatus?: JikanEpisodesCoverageStatus;
	episodeUpdatesQueueStatus?: "pending" | "processing" | "failed";
	// Distinguishes film-like second-level media from episodic medias for UI behavior,
	// but it must not be the only guard for media-level timed issue markers:
	// single/special entries can be non-MOVIE while Jikan exposes no child list.
	isFilm: boolean;
	// Media-level timed issue markers are allowed when there is no usable child
	// episode row to carry the timestamp. This is independent from whether the
	// Episodes tab should explain a known multi-episode provider data gap.
	supportsMediaPlaybackIssueMoments: boolean;
	isWatched?: boolean;
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
	groups?: MediaInspectionGroupCard[];
	playbackIssueNote?: string;
	hasDubIssue?: boolean;
	hasSubIssue?: boolean;
	hasEncodingIssue?: boolean;
	hasAudioIssue?: boolean;
	hasVideoIssue?: boolean;
	playbackIssueMoments?: EpisodePlaybackIssueMoment[];
	hasHydrationIssue?: boolean;
	episodes: MediaEpisodeInspectionRow[];
}
