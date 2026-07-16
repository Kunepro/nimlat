import { sql } from "../../../utils/sql-flag";
import {
	MAX_HYDRATION_RETRY_COUNT,
	TERMINAL_JIKAN_FAILURE_REASON_SQL_LIST,
} from "./hydration-queue-policy";

// Statement-only command module for Errored Content retry/hide actions. Keeping
// retry eligibility SQL here makes command orchestration reviewable without
// changing the released AnimeDB schema.

// noinspection SqlResolve
export const STMT_RETRY_CHARACTERS = sql`
    UPDATE anime_data.mediaHydrationQueueCharacters
    SET status       = 'pending',
        retryCount   = 0,
        errorMessage = NULL,
        lastTriedAt = NULL,
        hiddenAt    = NULL
    WHERE mediaId = ?
      AND status IN ('failed', 'pending')
`;

// noinspection SqlResolve
export const STMT_RETRY_STAFF = sql`
    UPDATE anime_data.mediaHydrationQueueStaff
    SET status       = 'pending',
        retryCount   = 0,
        errorMessage = NULL,
        lastTriedAt = NULL,
        hiddenAt    = NULL
    WHERE mediaId = ?
      AND status IN ('failed', 'pending')
`;

// noinspection SqlResolve
export const STMT_RETRY_JIKAN_EPISODES = sql`
    UPDATE anime_data.mediaHydrationQueueJikanEpisodes
    SET status        = 'pending',
        retryCount    = 0,
        errorMessage  = NULL,
        failureReason = NULL,
        lastTriedAt = NULL,
        hiddenAt    = NULL
    WHERE mediaId = ?
      AND status IN ('failed', 'pending')
      AND (
        failureReason IS NULL
            OR failureReason NOT IN (${ TERMINAL_JIKAN_FAILURE_REASON_SQL_LIST })
        )
`;

// noinspection SqlResolve
export const STMT_RETRY_JIKAN_THUMBNAILS = sql`
    UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
    SET status        = 'pending',
        retryCount    = 0,
        errorMessage  = NULL,
        failureReason = NULL,
        lastTriedAt   = NULL,
        hiddenAt      = NULL,
        priority      = 1,
        requestedAt   = ?
    WHERE mediaId = ?
      AND status IN ('failed', 'pending')
      AND (
        failureReason IS NULL
            OR failureReason NOT IN (${ TERMINAL_JIKAN_FAILURE_REASON_SQL_LIST })
        )
`;

// noinspection SqlResolve
export const STMT_RETRY_ALL_CHARACTERS = sql`
    UPDATE anime_data.mediaHydrationQueueCharacters
    SET status       = 'pending',
        retryCount   = 0,
        errorMessage = NULL,
        lastTriedAt  = NULL,
        hiddenAt     = NULL
    WHERE status IN ('failed', 'pending')
      AND retryCount > 0
`;

// noinspection SqlResolve
export const STMT_RETRY_ALL_STAFF = sql`
    UPDATE anime_data.mediaHydrationQueueStaff
    SET status       = 'pending',
        retryCount   = 0,
        errorMessage = NULL,
        lastTriedAt  = NULL,
        hiddenAt     = NULL
    WHERE status IN ('failed', 'pending')
      AND retryCount > 0
`;

// noinspection SqlResolve
export const STMT_SELECT_RETRYABLE_JIKAN_EPISODE_MEDIA_IDS = sql`
    SELECT mediaId
    FROM anime_data.mediaHydrationQueueJikanEpisodes
    WHERE status IN ('failed', 'pending')
      AND retryCount > 0
      AND (
        failureReason IS NULL
            OR failureReason NOT IN (${ TERMINAL_JIKAN_FAILURE_REASON_SQL_LIST })
        )
`;

// noinspection SqlResolve
export const STMT_RETRY_ALL_JIKAN_EPISODES = sql`
    UPDATE anime_data.mediaHydrationQueueJikanEpisodes
    SET status        = 'pending',
        retryCount    = 0,
        errorMessage  = NULL,
        failureReason = NULL,
        lastTriedAt   = NULL,
        hiddenAt      = NULL
    WHERE status IN ('failed', 'pending')
      AND retryCount > 0
      AND (
        failureReason IS NULL
            OR failureReason NOT IN (${ TERMINAL_JIKAN_FAILURE_REASON_SQL_LIST })
        )
`;

// noinspection SqlResolve
export const STMT_RETRY_ALL_JIKAN_THUMBNAILS = sql`
    UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
    SET status        = 'pending',
        retryCount    = 0,
        errorMessage  = NULL,
        failureReason = NULL,
        lastTriedAt   = NULL,
        hiddenAt      = NULL,
        priority      = 1,
        requestedAt   = ?
    WHERE status IN ('failed', 'pending')
      AND retryCount > 0
      AND (
        failureReason IS NULL
            OR failureReason NOT IN (${ TERMINAL_JIKAN_FAILURE_REASON_SQL_LIST })
        )
`;

// noinspection SqlResolve
export const STMT_UPSERT_JIKAN_EPISODES_PRIORITY = sql`
    INSERT OR
    REPLACE
    INTO anime_data.mediaHydrationQueueJikanEpisodesPriority (mediaId,
                                                              priority,
                                                              requestedAt)
    VALUES (?, 1, ?)
`;

// noinspection SqlResolve
export const STMT_HIDE_CHARACTERS = sql`
    UPDATE anime_data.mediaHydrationQueueCharacters
    SET hiddenAt = ?
    WHERE mediaId = ?
      AND (status = 'failed'
        OR (status = 'pending'
            AND retryCount > 0
            AND retryCount < ${ MAX_HYDRATION_RETRY_COUNT }))
`;

// noinspection SqlResolve
export const STMT_HIDE_STAFF = sql`
    UPDATE anime_data.mediaHydrationQueueStaff
    SET hiddenAt = ?
    WHERE mediaId = ?
      AND (status = 'failed'
        OR (status = 'pending'
            AND retryCount > 0
            AND retryCount < ${ MAX_HYDRATION_RETRY_COUNT }))
`;

// noinspection SqlResolve
export const STMT_HIDE_JIKAN_EPISODES = sql`
    UPDATE anime_data.mediaHydrationQueueJikanEpisodes
    SET hiddenAt = ?
    WHERE mediaId = ?
      AND (status = 'failed'
        OR (status = 'pending'
            AND retryCount > 0
            AND retryCount < ${ MAX_HYDRATION_RETRY_COUNT }))
`;

// noinspection SqlResolve
export const STMT_HIDE_JIKAN_THUMBNAILS = sql`
    UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
    SET hiddenAt = ?
    WHERE mediaId = ?
      AND (status = 'failed'
        OR (status = 'pending'
            AND retryCount > 0
            AND retryCount < ${ MAX_HYDRATION_RETRY_COUNT }))
`;
