import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import type {
	MediaEpisodeUpdatesIssueReason,
	MediaJikanEpisodesQueueDto,
} from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import {
	getJikanEpisodesQueueReadyWhereClause,
	getJikanEpisodesRetryDueAtSql,
	MAX_HYDRATION_RETRY_COUNT,
} from "./hydration-queue-policy";

export function getGroupJikanEpisodesQueueCount(): number {
	const db = getDatabase();

	const stmt   = db.prepare<number, { count: number }>(`
        SELECT COUNT(*) as count FROM anime_data.mediaHydrationQueueJikanEpisodes
        WHERE ${ getJikanEpisodesQueueReadyWhereClause("mediaHydrationQueueJikanEpisodes") }
    `);
	const result = stmt.get(Date.now()) || { count: 0 };
	return result.count;
}

export function getMediasFromGroupJikanEpisodesQueue(): number[] {
	const db = getDatabase();

	const stmt = db.prepare<number, Pick<MediaJikanEpisodesQueueDto, "mediaId">>(`
        SELECT q.mediaId
        FROM anime_data.mediaHydrationQueueJikanEpisodes q
        LEFT JOIN anime_data.mediaHydrationQueueJikanEpisodesPriority p
          ON p.mediaId = q.mediaId
        WHERE ${ getJikanEpisodesQueueReadyWhereClause("q") }
        ORDER BY COALESCE(p.priority, 0) DESC, COALESCE(p.requestedAt, 0) DESC, q.mediaId ASC
    `);
	return stmt.all(Date.now()).map(row => row.mediaId);
}

// Startup and periodic sweeps call the same count/select path, so deferred rows recover after crash.
export function getNextGroupJikanEpisodesRetryAt(): number | null {
	const db = getDatabase();

	const stmt    = db.prepare<number, { retryAt: number | null }>(`
      SELECT MIN(${ getJikanEpisodesRetryDueAtSql("q") }) AS retryAt
      FROM anime_data.mediaHydrationQueueJikanEpisodes q
      WHERE q.status = 'pending'
        AND q.retryCount > 0
        AND q.retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
        AND q.lastTriedAt IS NOT NULL
        AND ${ getJikanEpisodesRetryDueAtSql("q") } > ?
	`);
	const retryAt = stmt.get(Date.now())?.retryAt;
	return typeof retryAt === "number" ? retryAt : null;
}

export function markGroupJikanEpisodesQueueProcessing(mediaId: number): void {
	const db   = getDatabase();
	const stmt = db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodes
      SET status      = 'processing',
          lastTriedAt = ?
      WHERE mediaId = ?
	`);
	stmt.run(
		Date.now(),
		mediaId,
	);
	// Errored Content has no manual refresh; status changes must publish so
	// retrying rows disappear or update as soon as the daemon picks them up.
	BUS_HydratorQueueChanges.next();
}

export function enqueueGroupJikanEpisodesQueue(mediaId: number, isManualPriority: boolean): void {
	const db = getDatabase();

	const tx = db.transaction(() => {
		const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO anime_data.mediaHydrationQueueJikanEpisodes (mediaId)
        VALUES (?)
		`);
		insertStmt.run(mediaId);

		const statusStmt  = db.prepare<number, {
			status: string;
		}>(`
      SELECT status
      FROM anime_data.mediaHydrationQueueJikanEpisodes
      WHERE mediaId = ?
		`);
		const queueStatus = statusStmt.get(mediaId)?.status;

		// Never reset an in-flight run. Keep processing state and checkpoint intact.
		if (queueStatus !== "processing") {
			const updateStmt = db.prepare(`
          UPDATE anime_data.mediaHydrationQueueJikanEpisodes
          SET status       = 'pending',
              retryCount   = 0,
              errorMessage  = NULL,
              failureReason = NULL
          WHERE mediaId = ?
			`);
			updateStmt.run(mediaId);
		}

		if (isManualPriority) {
			const priorityStmt = db.prepare(`
          INSERT OR
          REPLACE
          INTO anime_data.mediaHydrationQueueJikanEpisodesPriority (mediaId,
                                                                    priority,
                                                                    requestedAt)
          VALUES (?, 1, ?)
			`);
			priorityStmt.run(
				mediaId,
				Date.now(),
			);
		}
	});

	tx();
	BUS_HydratorQueueChanges.next();
}

export function deleteFromGroupJikanEpisodesQueue(mediaId: number): void {
	const db = getDatabase();

	const tx = db.transaction(() => {
		const deleteQueueStmt = db.prepare(`
        DELETE FROM anime_data.mediaHydrationQueueJikanEpisodes
        WHERE mediaId = ?
		`);
		deleteQueueStmt.run(mediaId);

		const deletePriorityStmt = db.prepare(`
        DELETE FROM anime_data.mediaHydrationQueueJikanEpisodesPriority
        WHERE mediaId = ?
		`);
		deletePriorityStmt.run(mediaId);
	});

	tx();
	BUS_HydratorQueueChanges.next();
}

export function updateFailedGroupJikanEpisodesQueue(
	mediaId: number,
	errorMessage: string,
	failureReason: MediaEpisodeUpdatesIssueReason = "transient_failure",
): void {
	const db = getDatabase();

	const stmt = db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodes
      SET lastTriedAt  = ?,
          errorMessage = ?,
          failureReason = ?,
          retryCount   = retryCount + 1,
          status       = CASE
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

export function markFailedGroupJikanEpisodesQueue(
	mediaId: number,
	errorMessage: string,
	failureReason: MediaEpisodeUpdatesIssueReason,
): void {
	const db   = getDatabase();
	const stmt = db.prepare(`
      UPDATE anime_data.mediaHydrationQueueJikanEpisodes
      SET lastTriedAt  = ?,
          errorMessage = ?,
          failureReason = ?,
          retryCount   = ${ MAX_HYDRATION_RETRY_COUNT },
          status       = 'failed'
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

export function getFailedGroupJikanEpisodesQueueEntry(mediaId: number): {
	mediaId: number;
	errorMessage: string | null;
	failureReason: MediaEpisodeUpdatesIssueReason | null;
	retryCount: number;
	lastTriedAt: number | null;
} | null {
	const db   = getDatabase();
	const stmt = db.prepare<number, {
		mediaId: number;
		errorMessage: string | null;
		failureReason: MediaEpisodeUpdatesIssueReason | null;
		retryCount: number;
		lastTriedAt: number | null;
	}>(`
      SELECT mediaId, errorMessage, failureReason, retryCount, lastTriedAt
      FROM anime_data.mediaHydrationQueueJikanEpisodes
      WHERE mediaId = ?
        AND status = 'failed'
	`);
	return stmt.get(mediaId) || null;
}

export function getGroupJikanEpisodesQueueStatus(mediaId: number): {
	mediaId: number;
	status: string;
} | null {
	const db   = getDatabase();
	const stmt = db.prepare<number, {
		mediaId: number;
		status: string;
	}>(`
      SELECT mediaId, status
      FROM anime_data.mediaHydrationQueueJikanEpisodes
      WHERE mediaId = ?
	`);
	return stmt.get(mediaId) || null;
}

export function hasGroupJikanEpisodesQueueManualPriority(mediaId: number): boolean {
	const db   = getDatabase();
	const stmt = db.prepare<number, { count: number }>(`
      SELECT COUNT(*) as count
      FROM anime_data.mediaHydrationQueueJikanEpisodesPriority
      WHERE mediaId = ?
	`);
	return (stmt.get(mediaId)?.count || 0) > 0;
}
