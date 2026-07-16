import { isSupportedAnimatedMediaFormat } from "@nimlat/constants/supported-media-formats";
import { logAniListCatalogMediasPage } from "@nimlat/loggers/main";
import {
	ANILIST_API,
	AniListMedia,
	MediaSort,
	PagedResponse,
} from "@nimlat/types/ani-list-media-api";
import { request } from "graphql-request";
import { ANILIST_MEDIA_FIELDS } from "./ani-list.media-fields";
import { sanitizeAniListPagedMediasResponse } from "./sanitize-ani-list-media";

// Fetch one full-catalog batch. `ANILIST_MEDIA_FIELDS` deliberately returns the
// complete catalog payload needed by the canonical media upsert; downstream
// hydration queues add characters, staff, Jikan episodes, and thumbnails rather
// than fetching this media payload a second time. This function performs provider
// I/O plus diagnostic logging but no DB/UI mutation; callers own rate limiting,
// retry, persistence, and checkpoint policy.
export async function queryAllMediasPage(
	page: number,
	perPage: number       = 50,
	includeAdult: boolean = true,
	sort: MediaSort[]     = [ "ID" ],
	idIn?: number[],
): Promise<PagedResponse<AniListMedia>> {
	// The same query supports full ID-window scans and updated-at incremental scans;
	// callers supply the ordering and checkpoint strategy.
	const query = `
    query ($page: Int, $perPage: Int, $isAdult: Boolean, $sort: [MediaSort], $idIn: [Int]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        media(type: ANIME, isAdult: $isAdult, sort: $sort, id_in: $idIn) {
          ${ ANILIST_MEDIA_FIELDS }
        }
      }
    }
  `;

	const variables = {
		page,
		perPage,
		// AniList treats an omitted adult filter as "both"; false is the explicit
		// non-adult-only mode.
		isAdult: includeAdult ? undefined : false,
		// Full scans use ID order; incremental updates pass UPDATED_AT_DESC and own the overlap policy.
		sort,
		idIn,
	};

	// Provider adapters own rate limiting around this API-only primitive.
	const response          = await request<PagedResponse<AniListMedia>>(
		ANILIST_API,
		query,
		variables,
	);
	const sanitizedResponse = sanitizeAniListPagedMediasResponse(response);
	const filteredResponse  = {
		Page: {
			...sanitizedResponse.Page,
			// AniList's ANIME type includes formats Nimlat does not model; filtering
			// here keeps unsupported rows out of every scanner/updater write path.
			media: sanitizedResponse.Page.media.filter((media) => isSupportedAnimatedMediaFormat(media.format)),
		},
	};
	logAniListCatalogMediasPage(
		filteredResponse,
		{
			page,
			perPage,
			includeAdult,
		},
	);
	return filteredResponse;
}

// Fetch only the current highest AniList anime ID. The full scanner uses this as the upper bound
// for ID-window scans; it deliberately avoids the full media sanitizer/filter path.
export async function queryLatestAnimeMediaId(): Promise<number> {
	const query = `
    query {
      Page(page: 1, perPage: 1) {
        media(type: ANIME, sort: [ID_DESC]) {
          id
        }
      }
    }
  `;
	const response = await request<PagedResponse<Pick<AniListMedia, "id">>>(
		ANILIST_API,
		query,
	);
	return response.Page.media[ 0 ]?.id ?? 0;
}
