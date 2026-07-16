import {
	AniListCharacter,
	AniListMedia,
	PagedResponse,
	StaffEdge,
} from "@nimlat/types/ani-list-media-api";
import type { QueryAnimeMediasPageRequest } from "@nimlat/types/provider-clients";
import {
	filter,
	lastValueFrom,
	map,
	type Observable,
} from "rxjs";
import {
	type AniListPagedFetchEvent,
	isAniListFetchCompletedEvent,
} from "./ani-list/ani-list-paged-fetch-events";
import {
	aniListRateLimiter,
	AniListRateLimiterPriority,
	AniListRateLimiterRequestContext,
} from "./ani-list/ani-list.rate-limiter.singleton";
import { AniListCharactersFetcher } from "./ani-list/characters/ani-list-characters-fetcher";
import { getAnimeMediaById } from "./ani-list/media/ani-list.get-media-by-id";
import {
	queryAllMediasPage,
	queryLatestAnimeMediaId,
} from "./ani-list/media/ani-list.query-all-medias-page";
import { AniListStaffFetcher } from "./ani-list/staff/ani-list-staff-fetcher";

const MEDIA_RESULTS_PER_PAGE = 50;

export class AniListAPI {
	// Single rate-limited AniList entrypoint. Provider primitives may emit bounded
	// diagnostic logs, but persistence, toaster, and renderer effects stay with
	// callers. Never call the underlying fetchers directly.
	private static readonly charactersFetcher = new AniListCharactersFetcher();
	private static readonly staffFetcher      = new AniListStaffFetcher();

	// Query one complete-media catalog batch through the limiter. Full rebuilds use
	// stable ID windows; incremental updates use UPDATED_AT_DESC plus caller-owned overlap.
	static queryMediasListPage({
															 page,
															 perPage = MEDIA_RESULTS_PER_PAGE,
															 includeAdult = true,
															 sort = [ "ID" ],
															 idIn,
															 priority,
															 context = {},
														 }: QueryAnimeMediasPageRequest & {
		priority: AniListRateLimiterPriority;
		context?: Partial<AniListRateLimiterRequestContext>;
	}): Promise<PagedResponse<AniListMedia>> {
		return aniListRateLimiter.enqueue(
			() => queryAllMediasPage(
				page,
				perPage,
				includeAdult,
				sort,
				idIn,
			),
			priority,
			{
				operation: "catalog-page",
				page,
				perPage,
				sort,
				...context,
			},
		);
	}

	static queryLatestAnimeMediaId(
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Promise<number> {
		return aniListRateLimiter.enqueue(
			() => queryLatestAnimeMediaId(),
			priority,
			{
				operation: "catalog-max-id",
				page:    1,
				perPage: 1,
				sort:    [ "ID_DESC" ],
				...context,
			},
		);
	}

	// Fetch all character pages for one AniList media. Hydration callers pass the
	// lower `media-data` lane so complete catalog scan/update requests can finish
	// before this heavier paginated enrichment.
	static streamCharactersForMedia(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Observable<AniListPagedFetchEvent<AniListCharacter[]>> {
		return AniListAPI.charactersFetcher.streamAllCharacters(
			mediaId,
			priority,
			context,
		);
	}

	static loadCharactersForMedia(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Promise<AniListCharacter[]> {
		return lastValueFrom(AniListAPI.streamCharactersForMedia(
			mediaId,
			priority,
			context,
		).pipe(
			filter(isAniListFetchCompletedEvent),
			map((event) => event.items),
		));
	}

	static streamStaffForMedia(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Observable<AniListPagedFetchEvent<StaffEdge[]>> {
		return AniListAPI.staffFetcher.streamAllStaff(
			mediaId,
			priority,
			context,
		);
	}

	static loadStaffForMedia(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Promise<StaffEdge[]> {
		return lastValueFrom(AniListAPI.streamStaffForMedia(
			mediaId,
			priority,
			context,
		).pipe(
			filter(isAniListFetchCompletedEvent),
			map((event) => event.items),
		));
	}

	static getMediaById(
		mediaId: number,
		priority: AniListRateLimiterPriority,
		context: Partial<AniListRateLimiterRequestContext> = {},
	): Promise<AniListMedia> {
		return aniListRateLimiter.enqueue(
			() => getAnimeMediaById(mediaId),
			priority,
			{
				operation: "media-by-id",
				idAniList: mediaId,
				...context,
			},
		);
	}

}
