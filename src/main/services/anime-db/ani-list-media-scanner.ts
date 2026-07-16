import {
	AniListMedia,
	PageInfo,
} from "@nimlat/types/ani-list-media-api";
import { MediaProviderRegistry } from "../../providers/media-provider-registry";

export interface AniListMediasScanBatch {
	medias: AniListMedia[];
	pageInfo: PageInfo;
	requestCount: number;
	currentPage: number;
	batchMaxId: number;
}

// Stable full-catalog scanner. Each response contains the complete AniList media
// payload requested by ANILIST_MEDIA_FIELDS, not an ID-only discovery record.
// AniList rejects deep offset pages, so the scan walks explicit `id_in` windows
// while always requesting provider page 1. Empty windows are valid progress: the
// caller must commit their upper ID bound or the next run would replay them forever.
export async function* scanAllMedias(
	startAfterMediaId: number = 0,
	includeAdult: boolean = true,
	idsPerRequest: number = 50,
): AsyncGenerator<AniListMediasScanBatch> {
	const provider        = MediaProviderRegistry.getAniListMediaProvider();
	const maxKnownMediaId = await provider.queryLatestAnimeMediaId(
		"series-hydration",
		{
			source: "anime-db-populator",
			recovery: "full scanner discovers the current max AniList ID before walking ID windows",
		},
	);
	let nextMediaId       = Math.max(
		0,
		startAfterMediaId,
	) + 1;
	let requestCount      = 0;

	while (nextMediaId <= maxKnownMediaId) {
		const rangeStart = nextMediaId;
		const rangeEnd = Math.min(
			maxKnownMediaId,
			rangeStart + idsPerRequest - 1,
		);
		const idIn     = Array.from(
			{ length: (rangeEnd - rangeStart) + 1 },
			(_, index) => rangeStart + index,
		);
		const response = await provider.queryAnimeMediasPage({
			page:     1,
			includeAdult,
			perPage:  idsPerRequest,
			sort:     [ "ID" ],
			idIn,
			priority: "series-hydration",
			context:  {
				source:   "anime-db-populator",
				page:    requestCount + 1,
				perPage: idsPerRequest,
				sort:     [ "ID" ],
				recovery: "full scanner checkpoints completed ID windows and can replay the active window",
			},
		});
		const {
						pageInfo,
						media,
					}        = response.Page;

		requestCount++;
		const maxId = media.reduce(
			(
				max,
				mediaItem,
			) => Math.max(
				max,
				mediaItem.id,
			),
			0,
		);
		yield {
			medias:     media,
			pageInfo,
			requestCount,
			currentPage: requestCount,
			batchMaxId: Math.max(
				maxId,
				rangeEnd,
			),
		};

		nextMediaId = rangeEnd + 1;
	}
}
