import {
	AniListMedia,
	CharacterEdge,
	PagedResponse,
} from "@nimlat/types/ani-list-media-api";
import { DownloadReleaseAssetResult } from "@nimlat/types/github-release-asset-download";
import {
	GitHubRevision,
	ListAnimeDbRevisionsResult,
} from "@nimlat/types/github-revisions";
import {
	JikanEpisodeVideosResponse,
	JikanResponse,
} from "@nimlat/types/jikan-api";
import { LoggerUtils } from "../logger.utils";

function resolveMediaTitle(media: Pick<AniListMedia, "id" | "title">): string {
	return media.title?.english || media.title?.romaji || media.title?.native || `Media ${ media.id }`;
}

function mapMediaPreview(media: Pick<AniListMedia, "id" | "idMal" | "title" | "format" | "status">) {
	return {
		idAniList: media.id,
		idMal:     media.idMal ?? undefined,
		title:     resolveMediaTitle(media),
		format:    media.format ?? undefined,
		status:    media.status ?? undefined,
	};
}

function mapCharacterEdgePreview(edge: Pick<CharacterEdge, "role" | "node">) {
	return {
		id:   edge.node.id,
		name: edge.node.name.full ?? `Character ${ edge.node.id }`,
		role: edge.role ?? undefined,
	};
}

function mapRevisionPreview(revision: GitHubRevision) {
	return {
		id:          revision.id,
		tagName:     revision.tagName,
		name:        revision.name,
		assetsCount: revision.assets.length,
	};
}

function mapEpisodePreview(episode: { mal_id: number; title?: string | null; episode?: string | null }) {
	return {
		number: episode.mal_id,
		title:  episode.title ?? episode.episode ?? undefined,
	};
}

function getJikanEpisodesData(response: JikanResponse): JikanResponse["data"] {
	return Array.isArray(response.data) ? response.data : [];
}

function getJikanEpisodeVideosData(response: JikanEpisodeVideosResponse): JikanEpisodeVideosResponse["data"] {
	return Array.isArray(response.data) ? response.data : [];
}

// Log bounded previews from one complete-payload catalog batch. Keeping payload
// reduction here makes scan ordering/debug data visible without duplicating raw
// provider responses in the application log.
export function logAniListCatalogMediasPage(
	response: PagedResponse<AniListMedia>,
	metadata: { page: number; perPage: number; includeAdult: boolean; startAfterId?: number },
): void {
	LoggerUtils.logMainInfo(
		"api.anilist.query-all-medias-page",
		"AniList catalog page loaded.",
		{
			page:         metadata.page,
			perPage:      metadata.perPage,
			includeAdult: metadata.includeAdult,
			startAfterId: metadata.startAfterId,
			pageInfo:     response.Page.pageInfo,
			results:      response.Page.media.map(mapMediaPreview),
		},
	);
}

// Log one targeted complete-media response used by refresh/detail workflows.
export function logAniListMediaById(
	media: AniListMedia,
	metadata: { mediaId: number },
): void {
	LoggerUtils.logMainInfo(
		"api.anilist.get-media-by-id",
		"AniList media loaded.",
		{
			mediaId:  metadata.mediaId,
			response: {
				...mapMediaPreview(media),
				relationsCount:  media.relations?.edges?.length ?? 0,
				charactersCount: media.characters?.edges?.length ?? 0,
				tagsCount:       media.tags?.length ?? 0,
				description:     media.description ?? undefined,
			},
		},
	);
}

// Log one secondary AniList character-hydration page with bounded edge previews.
export function logAniListCharactersPage(
	response: {
		Media: {
			id: number;
			idMal: number | null;
			characters: {
				pageInfo: {
					total: number;
					perPage: number;
					currentPage: number;
					lastPage: number;
					hasNextPage: boolean;
				};
				edges: CharacterEdge[];
			};
		} | null;
	},
	metadata: { mediaId: number; page: number; perPage: number },
): void {
	LoggerUtils.logMainInfo(
		"api.anilist.characters-page",
		"AniList characters page loaded.",
		{
			mediaId:  metadata.mediaId,
			page:     metadata.page,
			perPage:  metadata.perPage,
			response: response.Media
									? {
					idAniList:  response.Media.id,
					idMal:      response.Media.idMal ?? undefined,
					pageInfo:   response.Media.characters.pageInfo,
					characters: response.Media.characters.edges.map(mapCharacterEdgePreview),
				}
									: null,
		},
	);
}

// Preserve empty successful Jikan pages in diagnostics because they carry a
// different state transition from transport/provider failure.
export function logJikanEpisodesPage(
	response: JikanResponse,
	metadata: { malId: number; page: number },
): void {
	LoggerUtils.logMainInfo(
		"api.jikan.episodes-page",
		"Jikan episodes page loaded.",
		{
			malId:      metadata.malId,
			page:       metadata.page,
			pagination: response.pagination,
			episodes: getJikanEpisodesData(response).map((episode) => mapEpisodePreview({
				mal_id: episode.mal_id,
				title:  episode.title,
			})),
		},
	);
}

// Log thumbnail-page outcomes, including synthetic empty responses used when
// Jikan explicitly reports that no episode-video resource exists.
export function logJikanEpisodeVideosPage(
	response: JikanEpisodeVideosResponse,
	metadata: { malId: number; page: number; wasSynthesizedFrom404?: boolean },
): void {
	LoggerUtils.logMainInfo(
		"api.jikan.episode-videos-page",
		"Jikan episode videos page loaded.",
		{
			malId:                 metadata.malId,
			page:                  metadata.page,
			wasSynthesizedFrom404: metadata.wasSynthesizedFrom404 ?? false,
			pagination:            response.pagination,
			videos: getJikanEpisodeVideosData(response).map((video) => mapEpisodePreview(video)),
		},
	);
}

// Log bounded release metadata used to compare installed and downloadable AnimeDB revisions.
export function logGitHubAnimeDbRevisions(
	result: ListAnimeDbRevisionsResult,
	metadata: { owner: string; repo: string; page: number; perPage: number },
): void {
	LoggerUtils.logMainInfo(
		"api.github.list-anime-db-revisions",
		"GitHub revisions page loaded.",
		{
			owner:       metadata.owner,
			repo:        metadata.repo,
			page:        metadata.page,
			perPage:     metadata.perPage,
			hasNextPage: result.hasNextPage,
			revisions:   result.revisions.map(mapRevisionPreview),
		},
	);
}

// Record only final transfer metadata; streamed progress belongs to the download bus.
export function logGitHubReleaseAssetDownloaded(
	result: DownloadReleaseAssetResult,
	metadata: { url: string; destinationPath: string },
): void {
	LoggerUtils.logMainInfo(
		"api.github.download-release-asset",
		"GitHub release asset downloaded.",
		{
			url:             metadata.url,
			destinationPath: metadata.destinationPath,
			totalBytes:      result.totalBytes ?? undefined,
		},
	);
}
