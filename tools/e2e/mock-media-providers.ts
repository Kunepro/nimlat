import { MediaProviderRegistry } from "../../src/main/providers/media-provider-registry";
import type {
	AniListMedia,
	MediaSort,
	PagedResponse,
} from "../../src/shared/types/ani-list-media-api";
import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "../../src/shared/types/jikan-api";
import type {
	ProviderRequestContext,
	ProviderRequestPriority,
} from "../../src/shared/types/provider-clients";

interface MockEpisodesPayload {
	episodes: JikanEpisode[];
	videos: JikanEpisodeVideo[];
}

interface MockPagedMediaResponseRequest {
	medias: AniListMedia[];
	page: number;
	perPage: number;
	includeAdult: boolean;
	sort: MediaSort[];
	idIn?: number[];
}

export interface MockMediaProviderDataset {
	fullMediasById: Map<number, AniListMedia>;
	episodesByMalId: Map<number, MockEpisodesPayload>;
}

function buildPagedMediaResponse(request: MockPagedMediaResponseRequest): PagedResponse<AniListMedia> {
	const {
					medias,
					page,
					perPage,
					includeAdult,
					sort,
					idIn,
				} = request;
	const filtered = medias
		.filter(media => includeAdult || !media.isAdult)
		.filter(media => !idIn || idIn.includes(media.id))
		.toSorted((left, right) => {
			if (sort.includes("UPDATED_AT_DESC")) {
				return (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
			}

			return left.id - right.id;
		});
	const offset = (page - 1) * perPage;

	return {
		Page: {
			pageInfo: {
				total:       filtered.length,
				perPage,
				currentPage: page,
				lastPage:    Math.max(
					1,
					Math.ceil(filtered.length / perPage),
				),
				hasNextPage: offset + perPage < filtered.length,
			},
			media:    filtered.slice(
				offset,
				offset + perPage,
			),
		},
	};
}

// Install deterministic external-provider doubles for Electron E2E and other
// offline integration tests. This keeps the full renderer -> IPC -> main -> DB
// flow network-free while still exercising provider-boundary orchestration.
export function installMockMediaProviders(dataset: MockMediaProviderDataset): void {
	MediaProviderRegistry.setAniListMediaProvider({
		getMediaById:            async (
			mediaId: number,
			priority: ProviderRequestPriority,
			context?: ProviderRequestContext,
		) => {
			void priority;
			void context;
			const media = dataset.fullMediasById.get(mediaId);
			if (!media) {
				throw new Error(`Missing mocked AniList media ${ mediaId }`);
			}

			return media;
		},
		queryAnimeMediasPage: async ({
																	 page,
																	 perPage = 50,
																	 includeAdult = true,
																	 sort = [ "ID" ],
																	 idIn,
																	 priority,
																	 context,
																 }) => {
			void priority;
			void context;
			return buildPagedMediaResponse({
				medias: Array.from(dataset.fullMediasById.values()),
				page,
				perPage,
				includeAdult,
				sort,
				idIn,
			});
		},
		queryLatestAnimeMediaId: async (
			priority: ProviderRequestPriority,
			context?: ProviderRequestContext,
		) => {
			void priority;
			void context;
			return Math.max(
				0,
				...Array.from(dataset.fullMediasById.keys()),
			);
		},
	});

	MediaProviderRegistry.setJikanEpisodesProvider({
		loadEpisodesPageForMedia:      async (malId: number, page: number) => {
			const payload = dataset.episodesByMalId.get(malId);
			if (!payload) {
				throw new Error(`Missing mocked Jikan episodes for MAL media ${ malId }`);
			}

			return {
				pagination: {
					has_next_page: false,
				},
				data:       page === 1 ? payload.episodes : [],
			};
		},
		loadEpisodeDetailsForMedia:    async (malId: number, episodeNumber: number) => {
			const payload = dataset.episodesByMalId.get(malId);
			if (!payload) {
				throw new Error(`Missing mocked Jikan episodes for MAL media ${ malId }`);
			}
			const episode = payload.episodes.find(candidate => candidate.mal_id === episodeNumber);
			if (!episode) {
				throw new Error(`Missing mocked Jikan episode ${ episodeNumber } for MAL media ${ malId }`);
			}

			return { data: episode };
		},
		loadEpisodeVideosPageForMedia: async (malId: number, page: number) => {
			const payload = dataset.episodesByMalId.get(malId);
			if (!payload) {
				throw new Error(`Missing mocked Jikan videos for MAL media ${ malId }`);
			}

			return {
				pagination: {
					has_next_page: false,
				},
				data:       page === 1 ? payload.videos : [],
			};
		},
	});
}
