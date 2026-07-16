import type { MediaSort } from "@nimlat/types/ani-list-media-api";
import { MediaProviderRegistry } from "../../providers/media-provider-registry";
import {
	ANILIST_PAGE_SIZE,
	type ProviderPage,
} from "./anime-db-update-policy";

// Keep provider query shape in one place so updater sweep policy does not need
// to know AniList request metadata beyond page and sort order.
export function queryAnimeDbUpdateProviderPage(page: number, sort: MediaSort[]): Promise<ProviderPage> {
	return MediaProviderRegistry.getAniListMediaProvider()
		.queryAnimeMediasPage({
			page,
			perPage:      ANILIST_PAGE_SIZE,
			includeAdult: true,
			sort,
			priority:     "series-hydration",
			context:      {
				source:   "anime-db-updater",
				page,
				perPage:  ANILIST_PAGE_SIZE,
				sort,
				recovery: "updater preserves the previous successful cursor and can replay the current sweep",
			},
		})
		.then(response => ({
			pageInfo: response.Page.pageInfo,
			medias:   response.Page.media,
		}));
}
