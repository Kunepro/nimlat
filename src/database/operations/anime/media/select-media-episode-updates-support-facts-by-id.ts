import { MediaEpisodeUpdatesSupportFactsDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type SupportFactsRow = {
	mediaId: number;
	episodesCount: number | null;
	hydratedEpisodesCount: number;
	hydratedEpisodesWithThumbnailCount: number;
	jikanEpisodesCoverageStatus: MediaEpisodeUpdatesSupportFactsDto["jikanEpisodesCoverageStatus"];
	jikanEpisodesProviderEpisodeCount: number | null;
};

// noinspection SqlResolve
const STMT_SELECT_MEDIA_EPISODE_UPDATES_SUPPORT_FACTS = sql`
    SELECT media.mediaId,
           media.episodesCount,
           COUNT(episodes.episodeId) AS hydratedEpisodesCount,
           SUM(CASE
                   WHEN episodes.thumbnail IS NOT NULL AND TRIM(episodes.thumbnail) <> '' THEN 1
                   ELSE 0
               END)                  AS hydratedEpisodesWithThumbnailCount,
           coverage.status           AS jikanEpisodesCoverageStatus,
           coverage.providerEpisodeCount AS jikanEpisodesProviderEpisodeCount
    FROM anime_data.media media
             LEFT JOIN anime_data.episodes episodes
                       ON episodes.mediaId = media.mediaId
             LEFT JOIN anime_data.mediaJikanEpisodesCoverage coverage
                       ON coverage.mediaId = media.mediaId
    WHERE media.mediaId = ?
    GROUP BY media.mediaId,
             media.episodesCount,
             coverage.status,
             coverage.providerEpisodeCount
`;

// Read only persisted facts needed to explain Jikan episode-update availability.
// Main/renderer policy derives labels from this narrow model rather than expanding
// general inspection queries with presentation-specific joins.
export function selectMediaEpisodeUpdatesSupportFactsById(mediaId: number): MediaEpisodeUpdatesSupportFactsDto | null {
	const row = getDatabase()
		.prepare(STMT_SELECT_MEDIA_EPISODE_UPDATES_SUPPORT_FACTS)
		.get(mediaId) as SupportFactsRow | undefined;

	if (!row) {
		return null;
	}

	return {
		mediaId:                            row.mediaId,
		episodesCount:                      row.episodesCount,
		hydratedEpisodesCount:              row.hydratedEpisodesCount,
		hydratedEpisodesWithThumbnailCount: row.hydratedEpisodesWithThumbnailCount || 0,
		jikanEpisodesCoverageStatus:       row.jikanEpisodesCoverageStatus,
		jikanEpisodesProviderEpisodeCount: row.jikanEpisodesProviderEpisodeCount,
	};
}
