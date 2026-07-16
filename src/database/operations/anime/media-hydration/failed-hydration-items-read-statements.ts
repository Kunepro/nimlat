import { sql } from "../../../utils/sql-flag";
import { FAILED_ITEMS_SOURCE_SELECT } from "./failed-hydration-source-select";

// Statement-only read module for Errored Content. The shared source SELECT owns
// queue visibility; these wrappers only apply page/detail filters.

// noinspection SqlResolve
export const STMT_SELECT_FAILED_ITEMS = sql`
    WITH failedItems AS (${ FAILED_ITEMS_SOURCE_SELECT })
    SELECT queue,
           mediaId,
           name,
           format,
           status,
           idAniList,
           idMal,
           errorMessage,
           failureReason,
           queueStatus,
           retryCount,
           lastTriedAt,
           nextAutoRetryAt,
           lastSuccessfulPage,
           resumeFromPage,
           isHidden,
           hiddenAt,
           canOpenMedia
    FROM failedItems
    WHERE (? IS NULL OR queue = ?)
      AND (? = 1 OR isHidden = 0)
    ORDER BY COALESCE(lastTriedAt, 0) DESC,
             queue ASC,
             mediaId ASC
    LIMIT ? OFFSET ?
`;

// noinspection SqlResolve
export const STMT_COUNT_FAILED_ITEMS = sql`
    WITH failedItems AS (${ FAILED_ITEMS_SOURCE_SELECT })
    SELECT COUNT(*) AS total
    FROM failedItems
    WHERE (? IS NULL OR queue = ?)
      AND (? = 1 OR isHidden = 0)
`;

// noinspection SqlResolve
export const STMT_SELECT_FAILED_ITEM_BY_KEY = sql`
    WITH failedItems AS (${ FAILED_ITEMS_SOURCE_SELECT })
    SELECT queue,
           mediaId,
           name,
           format,
           status,
           idAniList,
           idMal,
           errorMessage,
           failureReason,
           queueStatus,
           retryCount,
           lastTriedAt,
           nextAutoRetryAt,
           lastSuccessfulPage,
           resumeFromPage,
           isHidden,
           hiddenAt,
           canOpenMedia
    FROM failedItems
    WHERE queue = ?
      AND mediaId = ?
    LIMIT 1
`;
