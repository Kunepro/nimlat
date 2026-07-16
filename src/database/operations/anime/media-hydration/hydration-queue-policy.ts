import type { ErroredContentQueue } from "@nimlat/types/ipc-payloads";

// Queue rows are retried a small fixed number of times before they become
// manual-review failures. Keep daemon reads and Errored Content reads on one policy.
export const MAX_HYDRATION_RETRY_COUNT = 3;

const TERMINAL_JIKAN_FAILURE_REASONS = new Set([
	"missing_mal_id",
	"jikan_resource_unavailable",
	"episode_video_thumbnails_unavailable",
]);

export const TERMINAL_JIKAN_FAILURE_REASON_SQL_LIST = Array.from(TERMINAL_JIKAN_FAILURE_REASONS)
	.map(reason => `'${ reason }'`)
	.join(", ");

export function getJikanEpisodesRetryBackoffSql(alias: string): string {
	return `
        CASE
            WHEN ${ alias }.retryCount <= 1 THEN 120000
            WHEN ${ alias }.retryCount = 2 THEN 300000
            ELSE 900000
            END
	`;
}

export function getJikanEpisodesQueueReadyWhereClause(alias: string): string {
	// Retryable Jikan failures remain pending for the UI, but are hidden from
	// daemon reads until lastTriedAt has aged past the backoff. This prevents
	// event-bus loops while still letting new queue rows run immediately.
	return `
        ${ alias }.retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
        AND (
            ${ alias }.status = 'processing'
                OR (
                ${ alias }.status = 'pending'
                    AND (
                    ${ alias }.retryCount = 0
                        OR ${ alias }.lastTriedAt IS NULL
                        OR ${ alias }.lastTriedAt <= ? - ${ getJikanEpisodesRetryBackoffSql(alias) }
                    )
                )
            )
	`;
}

export function getJikanEpisodesRetryDueAtSql(alias: string): string {
	return `${ alias }.lastTriedAt + ${ getJikanEpisodesRetryBackoffSql(alias) }`;
}

export function getJikanEpisodeThumbnailsQueueReadyWhereClause(alias: string): string {
	return `
        ${ alias }.retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
        AND (
            ${ alias }.status = 'processing'
                OR (
                ${ alias }.status = 'pending'
                    AND ${ alias }.hasNextPage = 1
                    AND (
                    ${ alias }.retryCount = 0
                        OR ${ alias }.lastTriedAt IS NULL
                        OR ${ alias }.lastTriedAt <= ? - ${ getJikanEpisodesRetryBackoffSql(alias) }
                    )
                )
            )
        AND NOT EXISTS (
            SELECT 1
            FROM anime_data.mediaHydrationQueueJikanEpisodes episodeQueue
            WHERE episodeQueue.mediaId = ${ alias }.mediaId
              AND episodeQueue.status IN ('pending', 'processing')
        )
	`;
}

export function getJikanEpisodeThumbnailsRetryDueAtSql(alias: string): string {
	return `${ alias }.lastTriedAt + ${ getJikanEpisodesRetryBackoffSql(alias) }`;
}

export function isTerminalJikanFailure(
	queue: ErroredContentQueue,
	failureReason: string | null | undefined,
): boolean {
	return (queue === "jikan-episodes" || queue === "jikan-episode-thumbnails")
		&& failureReason != null
		&& TERMINAL_JIKAN_FAILURE_REASONS.has(failureReason);
}
