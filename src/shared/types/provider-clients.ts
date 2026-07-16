import type {
	AniListMedia,
	MediaSort,
	PagedResponse,
} from "./ani-list-media-api";
import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "./jikan-api";

// Scheduling classes at the external-provider boundary. Historical label
// `series-hydration` now covers complete catalog scan/update requests; it is a
// priority lane, not a claim that those requests use a hydration DB queue.
export type ProviderRequestPriority =
	| "manual"
	| "series-hydration"
	| "media-data"
	| "background";

export interface ProviderRequestContext {
	operation?: string;
	queue?: string;
	mediaId?: number;
	idAniList?: number;
	page?: number;
	perPage?: number;
	sort?: string[];
	source?: string;
	recovery?: string;
}

export interface QueryAnimeMediasPageRequest {
	page: number;
	perPage?: number;
	includeAdult?: boolean;
	sort?: MediaSort[];
	idIn?: number[];
	priority: ProviderRequestPriority;
	context?: ProviderRequestContext;
}

// Complete AniList media client used by scanner, updater, and targeted refreshes.
// Secondary Characters/Staff hydration uses dedicated paged fetchers instead.
// Tests replace this boundary with deterministic doubles; no test calls AniList.
export interface AniListMediaProviderClient {
	getMediaById(mediaId: number, priority: ProviderRequestPriority, context?: ProviderRequestContext): Promise<AniListMedia>;

	queryAnimeMediasPage(request: QueryAnimeMediasPageRequest): Promise<PagedResponse<AniListMedia>>;

	queryLatestAnimeMediaId(priority: ProviderRequestPriority, context?: ProviderRequestContext): Promise<number>;
}

// Jikan episode-enrichment boundary. Tests replace it with deterministic doubles
// so hydration retry/finalization behavior never depends on the live provider.
export interface JikanEpisodesProviderClient {
	loadEpisodesPageForMedia(malId: number, page: number, priority?: number): Promise<{
		pagination: {
			has_next_page: boolean;
		};
		data: JikanEpisode[];
	}>;

	loadEpisodeDetailsForMedia(malId: number, episodeNumber: number, priority?: number): Promise<{
		data: JikanEpisode;
	}>;

	loadEpisodeVideosPageForMedia(malId: number, page: number, priority?: number): Promise<{
		pagination: {
			has_next_page: boolean;
		};
		data: JikanEpisodeVideo[];
	}>;
}
