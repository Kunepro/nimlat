import { sql } from "../../../utils/sql-flag";

// Statement-only module for the Jikan episodes sync repository. Keeping these
// SQL fragments out of the orchestration module makes the resumable sync policy
// easier to review without changing the frozen AnimeDB schema.

// noinspection SqlResolve
export const STMT_SELECT_SYNC_STATE = sql`
    SELECT mediaId,
           syncRunId,
           phase,
           lastEpisodesPage,
           hasNextEpisodesPage,
           lastVideosPage,
           hasNextVideosPage,
           startedAt,
           updatedAt
    FROM anime_data.mediaHydrationJikanEpisodesSyncState
    WHERE mediaId = ?
`;

// noinspection SqlResolve
export const STMT_INSERT_SYNC_STATE = sql`
    INSERT OR
    REPLACE
    INTO anime_data.mediaHydrationJikanEpisodesSyncState (mediaId,
                                                          syncRunId,
                                                          phase,
                                                          lastEpisodesPage,
                                                          hasNextEpisodesPage,
                                                          lastVideosPage,
                                                          hasNextVideosPage,
                                                          startedAt,
                                                          updatedAt)
    VALUES (@mediaId,
            @syncRunId,
            @phase,
            @lastEpisodesPage,
            @hasNextEpisodesPage,
            @lastVideosPage,
            @hasNextVideosPage,
            @startedAt,
            @updatedAt)
`;

// noinspection SqlResolve
export const STMT_DELETE_STAGING_BY_MEDIA = sql`
    DELETE
    FROM anime_data.mediaHydrationJikanEpisodesStaging
    WHERE mediaId = ?
`;

// noinspection SqlResolve
export const STMT_UPSERT_STAGING_EPISODE = sql`
    INSERT OR
    REPLACE
    INTO anime_data.mediaHydrationJikanEpisodesStaging (mediaId,
                                                        syncRunId,
                                                        episodeNumber,
                                                        url,
                                                        name,
                                                        nameJapanese,
                                                        nameRomanji,
                                                        synopsis,
                                                        duration,
                                                        aired,
                                                        score,
                                                        filler,
                                                        recap,
                                                        thumbnail)
    VALUES (@mediaId,
            @syncRunId,
            @episodeNumber,
            @url,
            @name,
            @nameJapanese,
            @nameRomanji,
            @synopsis,
            @duration,
            @aired,
            @score,
            @filler,
            @recap,
            @thumbnail)
`;

// noinspection SqlResolve
export const STMT_UPDATE_STAGING_THUMBNAIL = sql`
    UPDATE anime_data.mediaHydrationJikanEpisodesStaging
    SET thumbnail = ?
    WHERE mediaId = ?
      AND syncRunId = ?
      AND episodeNumber = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_STAGING_EPISODE_THUMBNAIL_MATCH_ROW = sql`
    SELECT episodeNumber,
           name,
           nameJapanese,
           nameRomanji
    FROM anime_data.mediaHydrationJikanEpisodesStaging
    WHERE mediaId = ?
      AND syncRunId = ?
      AND episodeNumber = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_NEXT_STAGING_SYNOPSIS_CANDIDATE = sql`
    SELECT episodeNumber
    FROM anime_data.mediaHydrationJikanEpisodesStaging
    WHERE mediaId = ?
      AND syncRunId = ?
      AND episodeNumber > ?
    ORDER BY episodeNumber ASC
    LIMIT 1
`;

// noinspection SqlResolve
export const STMT_UPDATE_STAGING_EPISODE_SYNOPSIS = sql`
    UPDATE anime_data.mediaHydrationJikanEpisodesStaging
    SET synopsis = ?,
        duration = ?
    WHERE mediaId = ?
      AND syncRunId = ?
      AND episodeNumber = ?
`;

// noinspection SqlResolve
export const STMT_UPDATE_EPISODE_THUMBNAIL = sql`
    UPDATE anime_data.episodes
    SET thumbnail = ?
    WHERE mediaId = ?
      AND episodeNumber = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_EPISODE_THUMBNAIL_MATCH_ROW = sql`
    SELECT episodeNumber,
           name,
           nameJapanese,
           nameRomanji
    FROM anime_data.episodes
    WHERE mediaId = ?
      AND episodeNumber = ?
`;

// noinspection SqlResolve
export const STMT_CLEAR_EPISODE_THUMBNAILS = sql`
    UPDATE anime_data.episodes
    SET thumbnail = NULL
    WHERE mediaId = ?
      AND thumbnail IS NOT NULL
`;

// noinspection SqlResolve
export const STMT_FINALIZE_UPSERT_TO_EPISODES = sql`
    INSERT OR
    REPLACE
    INTO anime_data.episodes (mediaId,
                              episodeNumber,
                              url,
                              name,
                              nameJapanese,
                              nameRomanji,
                              synopsis,
                              duration,
                              aired,
                              score,
                              filler,
                              recap,
                              thumbnail)
    SELECT mediaId,
           episodeNumber,
           url,
           name,
           nameJapanese,
           nameRomanji,
           synopsis,
           duration,
           aired,
           score,
           filler,
           recap,
           thumbnail
    FROM anime_data.mediaHydrationJikanEpisodesStaging
    WHERE mediaId = ?
      AND syncRunId = ?
`;

// noinspection SqlResolve
export const STMT_FINALIZE_DELETE_MISSING = sql`
    DELETE
    FROM anime_data.episodes
    WHERE mediaId = ?
      AND episodeNumber NOT IN (SELECT episodeNumber
                                FROM anime_data.mediaHydrationJikanEpisodesStaging
                                WHERE mediaId = ?
                                  AND syncRunId = ?)
`;

// noinspection SqlResolve
export const STMT_COUNT_STAGING_EPISODES = sql`
    SELECT COUNT(*) AS count
    FROM anime_data.mediaHydrationJikanEpisodesStaging
    WHERE mediaId = ?
      AND syncRunId = ?
`;

// noinspection SqlResolve
export const STMT_SELECT_EPISODE_NUMBERS_BY_MEDIA = sql`
    SELECT episodeNumber
    FROM anime_data.episodes
    WHERE mediaId = ?
`;

// noinspection SqlResolve
export const STMT_UPSERT_JIKAN_EPISODES_COVERAGE = sql`
    INSERT OR
    REPLACE
    INTO anime_data.mediaJikanEpisodesCoverage (mediaId,
                                                status,
                                                providerEpisodeCount,
                                                lastSyncedAt)
    VALUES (?, ?, ?, ?)
`;

// noinspection SqlResolve
export const STMT_DELETE_SYNC_STATE = sql`
    DELETE
    FROM anime_data.mediaHydrationJikanEpisodesSyncState
    WHERE mediaId = ?
`;
