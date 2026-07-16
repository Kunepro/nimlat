import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import { getDatabase } from "../../../utils/get-db";
import { MAX_HYDRATION_RETRY_COUNT } from "./hydration-queue-policy";

type SimpleHydrationQueueTable =
	| "mediaHydrationQueueCharacters"
	| "mediaHydrationQueueStaff";

// The table name is intentionally restricted to the two simple media queues that share
// the same schema shape. More complex Jikan queues keep dedicated operations.
function getQueueTableSqlName(table: SimpleHydrationQueueTable): string {
	return `anime_data.${ table }`;
}

export function getSimpleHydrationQueueCount(table: SimpleHydrationQueueTable): number {
	const db = getDatabase();

	const stmt = db.prepare<[], { count: number }>(`
        SELECT COUNT(*) as count FROM ${ getQueueTableSqlName(table) }
        WHERE status IN ('pending', 'processing') AND retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
    `);
	return (stmt.get() || { count: 0 }).count;
}

export function getMediasFromSimpleHydrationQueue(table: SimpleHydrationQueueTable): number[] {
	const db = getDatabase();

	const stmt = db.prepare<[], { mediaId: number }>(`
        SELECT mediaId FROM ${ getQueueTableSqlName(table) }
        WHERE status IN ('pending', 'processing') AND retryCount < ${ MAX_HYDRATION_RETRY_COUNT }
        ORDER BY mediaId ASC
    `);
	return stmt.all().map(row => row.mediaId);
}

export function markSimpleHydrationQueueProcessing(table: SimpleHydrationQueueTable, mediaId: number): void {
	const db = getDatabase();
	db.prepare(`
      UPDATE ${ getQueueTableSqlName(table) }
      SET status      = 'processing',
          lastTriedAt = ?
      WHERE mediaId = ?
	`).run(
		Date.now(),
		mediaId,
	);
	// Errored Content has no manual refresh; status changes must publish so
	// retrying rows disappear or update as soon as the daemon picks them up.
	BUS_HydratorQueueChanges.next();
}

export function deleteFromSimpleHydrationQueue(table: SimpleHydrationQueueTable, mediaId: number): void {
	const db = getDatabase();

	db.prepare(`
        DELETE FROM ${ getQueueTableSqlName(table) }
        WHERE mediaId = ?
    `).run(mediaId);
	BUS_HydratorQueueChanges.next();
}

export function updateFailedSimpleHydrationQueue(
	table: SimpleHydrationQueueTable,
	mediaId: number,
	errorMessage: string,
): void {
	const db = getDatabase();

	db.prepare(`
      UPDATE ${ getQueueTableSqlName(table) }
      SET lastTriedAt  = ?,
          errorMessage = ?,
          retryCount   = retryCount + 1,
          status       = CASE
                             WHEN retryCount + 1 >= ${ MAX_HYDRATION_RETRY_COUNT } THEN 'failed'
                             ELSE 'pending'
              END
      WHERE mediaId = ?
	`).run(
		Date.now(),
		errorMessage,
		mediaId,
	);
	BUS_HydratorQueueChanges.next();
}
