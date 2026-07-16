import type { Database } from "better-sqlite3";

/**
 * Mark every still-pending reconcile conflict obsolete after a full snapshot rebuild.
 *
 * Historical rows are preserved for audit/debugging, but they should not keep showing as active
 * follow-up work once the user has abandoned the old snapshot entirely.
 */
export function supersedePendingReconcileConflictsInternal(db: Database): void {
	// noinspection SqlResolve
	db.prepare(`
        UPDATE userGroupingReconcileConflicts
        SET resolutionStatus = 'superseded'
        WHERE resolutionStatus = 'pending'
	`).run();
}
