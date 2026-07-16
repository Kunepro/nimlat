import {
	getJikanEpisodesRetryBackoffSql,
	MAX_HYDRATION_RETRY_COUNT,
} from "./hydration-queue-policy";

// This source SELECT is wrapped by each Errored Content read statement. Keeping
// the shared fragment as a complete SELECT avoids invalid standalone CTE SQL
// while preserving identical retry/resume semantics across list/count/detail.
// noinspection SqlResolve
export const FAILED_ITEMS_SOURCE_SELECT = `
    SELECT 'characters' AS queue,
                                queue.mediaId,
                                COALESCE(NULLIF(TRIM(media.name), ''),
                                         NULLIF(TRIM(media.nameRomanji), ''),
                                         NULLIF(TRIM(media.nameJapanese), ''),
                                         'Media ' || queue.mediaId) AS name,
                                media.format,
                                media.status,
                                media.idAniList,
                                media.idMal,
                                queue.errorMessage,
                                NULL AS failureReason,
                                queue.status                                       AS queueStatus,
                                queue.retryCount,
                                queue.lastTriedAt,
                                NULL                                               AS nextAutoRetryAt,
                                NULL                                               AS lastSuccessfulPage,
                                NULL                                               AS resumeFromPage,
                                CASE WHEN queue.hiddenAt IS NULL THEN 0 ELSE 1 END AS isHidden,
                                queue.hiddenAt,
                                CASE
                                    WHEN media.mediaId IS NOT NULL AND COALESCE(media.isStub, 1) = 0 THEN 1
                                    ELSE 0
                                    END AS canOpenMedia
                         FROM anime_data.mediaHydrationQueueCharacters queue
                                  LEFT JOIN anime_data.media media
                                            ON media.mediaId = queue.mediaId
                         WHERE queue.status = 'failed'
                            OR (queue.status = 'pending'
                                AND queue.retryCount > 0
                                AND queue.retryCount < ${ MAX_HYDRATION_RETRY_COUNT })
                         UNION ALL
                         SELECT 'staff' AS queue,
                                queue.mediaId,
                                COALESCE(NULLIF(TRIM(media.name), ''),
                                         NULLIF(TRIM(media.nameRomanji), ''),
                                         NULLIF(TRIM(media.nameJapanese), ''),
                                         'Media ' || queue.mediaId) AS name,
                                media.format,
                                media.status,
                                media.idAniList,
                                media.idMal,
                                queue.errorMessage,
                                NULL AS failureReason,
                                queue.status                                       AS queueStatus,
                                queue.retryCount,
                                queue.lastTriedAt,
                                NULL                                               AS nextAutoRetryAt,
                                NULL                                               AS lastSuccessfulPage,
                                NULL                                               AS resumeFromPage,
                                CASE WHEN queue.hiddenAt IS NULL THEN 0 ELSE 1 END AS isHidden,
                                queue.hiddenAt,
                                CASE
                                    WHEN media.mediaId IS NOT NULL AND COALESCE(media.isStub, 1) = 0 THEN 1
                                    ELSE 0
                                    END AS canOpenMedia
                         FROM anime_data.mediaHydrationQueueStaff queue
                                  LEFT JOIN anime_data.media media
                                            ON media.mediaId = queue.mediaId
                         WHERE queue.status = 'failed'
                            OR (queue.status = 'pending'
                                AND queue.retryCount > 0
                                AND queue.retryCount < ${ MAX_HYDRATION_RETRY_COUNT })
                         UNION ALL
                         SELECT 'jikan-episodes' AS queue,
                                queue.mediaId,
                                COALESCE(NULLIF(TRIM(media.name), ''),
                                         NULLIF(TRIM(media.nameRomanji), ''),
                                         NULLIF(TRIM(media.nameJapanese), ''),
                                         'Media ' || queue.mediaId) AS name,
                                media.format,
                                media.status,
                                media.idAniList,
                                media.idMal,
                                queue.errorMessage,
                                queue.failureReason,
                                queue.status                                       AS queueStatus,
                                queue.retryCount,
                                queue.lastTriedAt,
                                CASE
                                    WHEN queue.status = 'pending'
                                        AND queue.retryCount > 0
                                        AND queue.retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
                                        AND queue.lastTriedAt IS NOT NULL
                                        THEN queue.lastTriedAt + ${ getJikanEpisodesRetryBackoffSql("queue") }
                                    END                                            AS nextAutoRetryAt,
                                syncState.lastEpisodesPage                         AS lastSuccessfulPage,
                                CASE
                                    WHEN syncState.lastEpisodesPage IS NULL THEN NULL
                                    ELSE syncState.lastEpisodesPage + 1 END        AS resumeFromPage,
                                CASE WHEN queue.hiddenAt IS NULL THEN 0 ELSE 1 END AS isHidden,
                                queue.hiddenAt,
                                CASE
                                    WHEN media.mediaId IS NOT NULL AND COALESCE(media.isStub, 1) = 0 THEN 1
                                    ELSE 0
                                    END AS canOpenMedia
                         FROM anime_data.mediaHydrationQueueJikanEpisodes queue
                                  LEFT JOIN anime_data.media media
                                            ON media.mediaId = queue.mediaId
                                  LEFT JOIN anime_data.mediaHydrationJikanEpisodesSyncState syncState
                                            ON syncState.mediaId = queue.mediaId
                         WHERE queue.status = 'failed'
                            OR (queue.status = 'pending'
                                AND queue.retryCount > 0
                                AND queue.retryCount < ${ MAX_HYDRATION_RETRY_COUNT })
                         UNION ALL
                         SELECT 'jikan-episode-thumbnails'                         AS queue,
                                queue.mediaId,
                                COALESCE(NULLIF(TRIM(media.name), ''),
                                         NULLIF(TRIM(media.nameRomanji), ''),
                                         NULLIF(TRIM(media.nameJapanese), ''),
                                         'Media ' || queue.mediaId)                AS name,
                                media.format,
                                media.status,
                                media.idAniList,
                                media.idMal,
                                queue.errorMessage,
                                queue.failureReason,
                                queue.status                                       AS queueStatus,
                                queue.retryCount,
                                queue.lastTriedAt,
                                CASE
                                    WHEN queue.status = 'pending'
                                        AND queue.retryCount > 0
                                        AND queue.retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
                                        AND queue.lastTriedAt IS NOT NULL
                                        THEN queue.lastTriedAt + ${ getJikanEpisodesRetryBackoffSql("queue") }
                                    END                                            AS nextAutoRetryAt,
                                queue.lastPage                                     AS lastSuccessfulPage,
                                queue.lastPage + 1                                 AS resumeFromPage,
                                CASE WHEN queue.hiddenAt IS NULL THEN 0 ELSE 1 END AS isHidden,
                                queue.hiddenAt,
                                CASE
                                    WHEN media.mediaId IS NOT NULL AND COALESCE(media.isStub, 1) = 0 THEN 1
                                    ELSE 0
                                    END                                            AS canOpenMedia
                         FROM anime_data.mediaHydrationQueueJikanEpisodeThumbnails queue
                                  LEFT JOIN anime_data.media media
                                            ON media.mediaId = queue.mediaId
                         WHERE queue.status = 'failed'
                            OR (queue.status = 'pending'
                                AND queue.retryCount > 0
                                AND queue.retryCount < ${ MAX_HYDRATION_RETRY_COUNT })
`;

// Exposed only for unit coverage of this runtime-composed SQL fragment. The
// native SQLite module is Electron-built in this repo, so Vitest cannot safely
// prepare it directly without an ABI rebuild.
export function getFailedItemsSourceSelectForTest(): string {
	return FAILED_ITEMS_SOURCE_SELECT;
}
