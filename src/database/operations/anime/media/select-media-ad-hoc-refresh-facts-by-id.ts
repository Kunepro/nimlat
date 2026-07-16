import { MediaAdHocRefreshFactsDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type MediaAdHocRefreshFactsRow = MediaAdHocRefreshFactsDto;

// noinspection SqlResolve
const STMT_MEDIA_AD_HOC_REFRESH_FACTS = sql`
    SELECT media.mediaId,
           media.idAniList,
           media.idMal,
           media.status,
           media.episodesCount,
           media.nextAiringEpisode,
           media.nextAiringEpisodeJson,
           media.lastUpdatedAt,
           COUNT(episodes.episodeNumber) AS hydratedEpisodesCount,
           jikanQueue.status             AS jikanEpisodesQueueStatus,
           jikanQueue.failureReason      AS jikanEpisodesFailureReason,
           coverage.status               AS jikanEpisodesCoverageStatus,
           coverage.providerEpisodeCount AS jikanEpisodesProviderEpisodeCount
    FROM anime_data.media media
             LEFT JOIN anime_data.episodes episodes
                       ON episodes.mediaId = media.mediaId
             LEFT JOIN anime_data.mediaHydrationQueueJikanEpisodes jikanQueue
                       ON jikanQueue.mediaId = media.mediaId
             LEFT JOIN anime_data.mediaJikanEpisodesCoverage coverage
                       ON coverage.mediaId = media.mediaId
    WHERE media.mediaId = ?
      AND media.isStub = 0
    GROUP BY media.mediaId,
             media.idAniList,
             media.idMal,
             media.status,
             media.episodesCount,
             media.nextAiringEpisode,
             media.nextAiringEpisodeJson,
             media.lastUpdatedAt,
             jikanQueue.status,
             jikanQueue.failureReason,
             coverage.status,
             coverage.providerEpisodeCount
`;

// Reads only catalog freshness facts needed by inspection-triggered background updates.
// Keeping this narrower than full inspection avoids coupling auto-refresh decisions to
// renderer-shaped payloads or user override fields.
export function selectMediaAdHocRefreshFactsById(mediaId: number): MediaAdHocRefreshFactsDto | null {
	return getDatabase()
		.prepare<number, MediaAdHocRefreshFactsRow>(STMT_MEDIA_AD_HOC_REFRESH_FACTS)
		.get(mediaId) ?? null;
}
