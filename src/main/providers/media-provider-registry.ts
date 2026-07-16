import type {
	AniListMediaProviderClient,
	JikanEpisodesProviderClient,
} from "@nimlat/types/provider-clients";
import { AniListAPI } from "../api/ani-list-api";
import { JikanAPI } from "../api/jikan-api";

const defaultAniListMediaProvider: AniListMediaProviderClient = {
	getMediaById:            (
														 mediaId,
														 priority,
		                         context,
													 ) => AniListAPI.getMediaById(
		mediaId,
		priority,
		context,
	),
	queryAnimeMediasPage:    request => AniListAPI.queryMediasListPage(request),
	queryLatestAnimeMediaId: (
														 priority,
		                         context,
													 ) => AniListAPI.queryLatestAnimeMediaId(
		priority,
		context,
	),
};

const defaultJikanEpisodesProvider: JikanEpisodesProviderClient = {
	loadEpisodesPageForMedia:      (
																	 malId,
																	 page,
																	 priority = 0,
																 ) => JikanAPI.loadEpisodesPageForMedia(
		malId,
		page,
		priority,
	),
	loadEpisodeVideosPageForMedia: (
																	 malId,
																	 page,
																	 priority = 0,
																 ) => JikanAPI.loadEpisodeVideosPageForMedia(
		malId,
		page,
		priority,
	),
	loadEpisodeDetailsForMedia:    (
																	 malId,
		                               episodeNumber,
		                               priority = 0,
																 ) => JikanAPI.loadEpisodeDetailsForMedia(
		malId,
		episodeNumber,
		priority,
	),
};

let aniListMediaProvider: AniListMediaProviderClient   = defaultAniListMediaProvider;
let jikanEpisodesProvider: JikanEpisodesProviderClient = defaultJikanEpisodesProvider;

// Central registry for external media providers.
// Production uses the live API adapters; tests can swap in deterministic doubles
// without reaching the network or production rate limiters.
export const MediaProviderRegistry = {
	getAniListMediaProvider(): AniListMediaProviderClient {
		return aniListMediaProvider;
	},
	setAniListMediaProvider(provider: AniListMediaProviderClient): void {
		aniListMediaProvider = provider;
	},
	resetAniListMediaProvider(): void {
		aniListMediaProvider = defaultAniListMediaProvider;
	},
	getJikanEpisodesProvider(): JikanEpisodesProviderClient {
		return jikanEpisodesProvider;
	},
	setJikanEpisodesProvider(provider: JikanEpisodesProviderClient): void {
		jikanEpisodesProvider = provider;
	},
	resetJikanEpisodesProvider(): void {
		jikanEpisodesProvider = defaultJikanEpisodesProvider;
	},
	resetAll(): void {
		aniListMediaProvider  = defaultAniListMediaProvider;
		jikanEpisodesProvider = defaultJikanEpisodesProvider;
	},
};
