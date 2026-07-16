import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import type {
	MediaEpisodeUpdatesIssueReason,
	MediaJikanEpisodeThumbnailsQueueDto,
} from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import {
	getJikanEpisodeThumbnailsQueueReadyWhereClause,
	getJikanEpisodeThumbnailsRetryDueAtSql,
	MAX_HYDRATION_RETRY_COUNT,
} from "./hydration-queue-policy";

export function getJikanEpisodeThumbnailsQueueCount(): number {
	const db = getDatabase();

	const stmt   = db.prepare<number, { count: number }>(`
        SELECT COUNT(*) as count FROM anime_data.mediaHydrationQueueJikanEpisodeThumbnails thumbnailQueue
        WHERE ${ getJikanEpisodeThumbnailsQueueReadyWhereClause("thumbnailQueue") }
    `);
	const result = stmt.get(Date.now()) || { count: 0 };
	return result.count;
}

export function getMediasFromJikanEpisodeThumbnailsQueue(): number[] {
	const db = getDatabase();

	const stmt = db.prepare<number, Pick<MediaJikanEpisodeThumbnailsQueueDto, "mediaId">>(`
        SELECT q.mediaId
        FROM anime_data.mediaHydrationQueueJikanEpisodeThumbnails q
        WHERE ${ getJikanEpisodeThumbnailsQueueReadyWhereClause("q") }
        ORDER BY q.priority DESC, q.requestedAt DESC, q.mediaId ASC
    `);
	return stmt.all(Date.now()).map(row => row.mediaId);
}

export function getNextJikanEpisodeThumbnailsRetryAt(): number | null {
	const db = getDatabase();

	const stmt    = db.prepare<number, { retryAt: number | null }>(`
      SELECT MIN(${ getJikanEpisodeThumbnailsRetryDueAtSql("q") }) AS retryAt
      FROM anime_data.mediaHydrationQueueJikanEpisodeThumbnails q
      WHERE q.status = 'pending'
        AND q.retryCount > 0
        AND q.retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
        AND q.lastTriedAt IS NOT NULL
        AND ${ getJikanEpisodeThumbnailsRetryDueAtSql("q") } > ?
	`);
	const retryAt = stmt.get(Date.now())?.retryAt;
	return typeof retryAt === "number" ? retryAt : null;
}

export function markJikanEpisodeThumbnailsQueueProcessing(mediaId: number): void {
	const db   = getDatabase();
	const stmt = db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
      SET status      = 'processing',
          lastTriedAt = ?
      WHERE mediaId = ?
	`);
	stmt.run(
		Date.now(),
		mediaId,
	);
	BUS_HydratorQueueChanges.next();
}

export function enqueueJikanEpisodeThumbnailsQueue(mediaId: number, options: {
	isManualPriority?: boolean;
	resetProgress?: boolean;
} = {}): void {
	const db  = getDatabase();
	const now = Date.now();

	const tx = db.transaction(() => {
		db.prepare(`
        INSERT OR IGNORE INTO anime_data.mediaHydrationQueueJikanEpisodeThumbnails (mediaId, requestedAt)
        VALUES (?, ?)
		`).run(
			mediaId,
			now,
		);

		db.prepare(`
        UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
        SET status        = 'pending',
            retryCount    = 0,
            errorMessage  = NULL,
            failureReason = NULL,
            hiddenAt      = NULL,
            lastTriedAt   = NULL,
            priority      = CASE WHEN ? = 1 THEN 1 ELSE priority END,
            requestedAt   = CASE WHEN ? = 1 THEN ? ELSE requestedAt END,
            lastPage      = CASE WHEN ? = 1 THEN 0 ELSE lastPage END,
            hasNextPage   = 1
        WHERE mediaId = ?
          AND status <> 'processing'
		`).run(
			options.isManualPriority ? 1 : 0,
			options.isManualPriority ? 1 : 0,
			now,
			options.resetProgress ? 1 : 0,
			mediaId,
		);
	});

	tx();
	BUS_HydratorQueueChanges.next();
}

export function deleteFromJikanEpisodeThumbnailsQueue(mediaId: number): void {
	const db   = getDatabase();
	const stmt = db.prepare(`
        DELETE FROM anime_data.mediaHydrationQueueJikanEpisodeThumbnails
        WHERE mediaId = ?
    `);
	stmt.run(mediaId);
	BUS_HydratorQueueChanges.next();
}

export function updateFailedJikanEpisodeThumbnailsQueue(
	mediaId: number,
	errorMessage: string,
	failureReason: MediaEpisodeUpdatesIssueReason = "transient_failure",
): void {
	const db   = getDatabase();
	const stmt = db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
      SET lastTriedAt   = ?,
          errorMessage  = ?,
          failureReason = ?,
          retryCount    = retryCount + 1,
          status        = CASE
                              WHEN retryCount + 1 >= ${ MAX_HYDRATION_RETRY_COUNT } THEN 'failed'
                              ELSE 'pending'
              END
      WHERE mediaId = ?
	`);
	stmt.run(
		Date.now(),
		errorMessage,
		failureReason,
		mediaId,
	);
	BUS_HydratorQueueChanges.next();
}

export function markFailedJikanEpisodeThumbnailsQueue(
	mediaId: number,
	errorMessage: string,
	failureReason: MediaEpisodeUpdatesIssueReason,
): void {
	const db   = getDatabase();
	const stmt = db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
      SET lastTriedAt   = ?,
          errorMessage  = ?,
          failureReason = ?,
          retryCount    = ${ MAX_HYDRATION_RETRY_COUNT },
          status        = 'failed'
      WHERE mediaId = ?
	`);
	stmt.run(
		Date.now(),
		errorMessage,
		failureReason,
		mediaId,
	);
	BUS_HydratorQueueChanges.next();
}

export function getJikanEpisodeThumbnailsQueueEntry(mediaId: number): MediaJikanEpisodeThumbnailsQueueDto | null {
	const db   = getDatabase();
	const stmt = db.prepare<number, {
		mediaId: number;
		lastTriedAt: number | null;
		errorMessage: string | null;
		failureReason: MediaEpisodeUpdatesIssueReason | null;
		retryCount: number;
		status: string;
		lastPage: number;
		hasNextPage: number;
		priority: number;
		requestedAt: number;
	}>(`
      SELECT mediaId,
             lastTriedAt,
             errorMessage,
             failureReason,
             retryCount,
             status,
             lastPage,
             hasNextPage,
             priority,
             requestedAt
      FROM anime_data.mediaHydrationQueueJikanEpisodeThumbnails
      WHERE mediaId = ?
	`);
	const row  = stmt.get(mediaId);
	if (!row) {
		return null;
	}

	return {
		...row,
		lastTriedAt:   row.lastTriedAt ?? undefined,
		errorMessage:  row.errorMessage ?? undefined,
		failureReason: row.failureReason ?? undefined,
		hasNextPage:   row.hasNextPage === 1,
	};
}

export function updateJikanEpisodeThumbnailsProgress(
	mediaId: number,
	lastPage: number,
	hasNextPage: boolean,
): void {
	const db   = getDatabase();
	const stmt = db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodeThumbnails
      SET lastPage      = ?,
          hasNextPage   = ?,
          status        = 'processing',
          errorMessage  = NULL,
          failureReason = NULL
      WHERE mediaId = ?
	`);
	stmt.run(
		lastPage,
		hasNextPage ? 1 : 0,
		mediaId,
	);
	BUS_HydratorQueueChanges.next();
}
