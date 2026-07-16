import type {
	ReconcileLineageItem,
	ReconcilePreflightSummary,
	ReconcileRunStatus,
} from "@nimlat/types/anime-db-reconcile";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../../utils/get-db";
import { repairAndAssertAttachedAnimeDbReconcileSafety } from "../../../anime/metadata/validate-anime-db-reconcile-safety";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "../log-grouping-diagnostics-if-debugging-enabled";
import { getUserGroupingState } from "../user-grouping-state";
import { classifyReconcileLineages } from "./classify-reconcile-lineages";
import {
	buildReconcileConflictInputs,
	buildReconcilePreflightSummary,
	type ReconcileConflictInput,
} from "./reconcile-run-model";

// ---------------------------------------------------------------------------
// Run lifecycle
// ---------------------------------------------------------------------------

// Insert a new reconcile run row in `running` state and return its auto-increment id.
// Call this before running the classification so the run is traceable even if the process
// is interrupted.
function insertReconcileRun(
	db: Database,
	fromAnimeDbVersion: string | null,
	toAnimeDbVersion: string,
	startedAt: number,
): number {
	// noinspection SqlResolve
	return db.prepare<[ string | null, string, number ]>(`
        INSERT INTO userGroupingReconcileRuns (fromAnimeDbVersion,
                                               toAnimeDbVersion,
                                               startedAt,
                                               status)
        VALUES (?, ?, ?, 'running')
	`).run(
		fromAnimeDbVersion,
		toAnimeDbVersion,
		startedAt,
	).lastInsertRowid as number;
}

// Finalise a run row once the preflight completes (successfully or not).
function completeReconcileRun(
	db: Database,
	runId: number,
	completedAt: number,
	status: ReconcileRunStatus,
	summaryJson: string,
): void {
	// noinspection SqlResolve
	db.prepare<[ number, ReconcileRunStatus, string, number ]>(`
        UPDATE userGroupingReconcileRuns
        SET completedAt  = ?,
            status       = ?,
            summaryJson  = ?
        WHERE id = ?
	`).run(
		completedAt,
		status,
		summaryJson,
		runId,
	);
}

// ---------------------------------------------------------------------------
// Conflict persistence
// ---------------------------------------------------------------------------

// Bulk-insert conflict rows for a reconcile run.
// Each conflict describes one lineage (or media) that requires manual review.
//
// The `resolutionStatus` column defaults to `'pending'` in the schema and is not set here.
function insertReconcileConflicts(
	db: Database,
	runId: number,
	conflicts: ReconcileConflictInput[],
): void {
	if (conflicts.length === 0) {
		return;
	}

	// noinspection SqlResolve
	const stmt = db.prepare<[ number, string, number | null, number | null, number | null, string ]>(`
        INSERT INTO userGroupingReconcileConflicts (runId,
                                                    conflictType,
                                                    groupLineageId,
                                                    mediaId,
                                                    userGroupId,
                                                    payloadJson)
        VALUES (?, ?, ?, ?, ?, ?)
	`);

	db.transaction(() => {
		for (const conflict of conflicts) {
			stmt.run(
				runId,
				conflict.conflictType,
				conflict.groupLineageId,
				conflict.mediaId,
				conflict.userGroupId,
				conflict.payloadJson,
			);
		}
	})();
}

// ---------------------------------------------------------------------------
// Public facade helpers (used by UserDbFacade.groupingReconcile)
// ---------------------------------------------------------------------------

// Convenience wrapper: insert run, read classified lineages, persist conflict rows,
// and finalise the run, all using the shared database instance.
//
// The reader must return already-classified items and must not perform DB writes.
// Returns the runId so the caller can attach it to the returned report.
export function runAndPersistReconcilePreflight(params: {
	fromAnimeDbVersion: string | null;
	toAnimeDbVersion: string;
	readClassifiedLineages: (db: Database) => ReconcileLineageItem[];
}): {
	runId: number;
	startedAt: number;
	completedAt: number;
	items: ReconcileLineageItem[];
	summary: ReconcilePreflightSummary;
} {
	const db    = getDatabase();
	const startedAt = Date.now();
	const runId = insertReconcileRun(
		db,
		params.fromAnimeDbVersion,
		params.toAnimeDbVersion,
		startedAt,
	);

	let items: ReconcileLineageItem[];
	let summary: ReconcilePreflightSummary;

	try {
		items = params.readClassifiedLineages(db);
		summary = buildReconcilePreflightSummary(items);
	} catch (error) {
		// Finalise run as failed so the row is not left dangling in `running` state.
		const failedAt = Date.now();
		completeReconcileRun(
			db,
			runId,
			failedAt,
			"failed",
			JSON.stringify({ error: String(error) }),
		);
		throw error;
	}

	const conflicts = buildReconcileConflictInputs(items);
	const completedAt = Date.now();
	insertReconcileConflicts(
		db,
		runId,
		conflicts,
	);
	completeReconcileRun(
		db,
		runId,
		completedAt,
		"completed",
		JSON.stringify(summary),
	);

	return {
		runId,
		startedAt,
		completedAt,
		items,
		summary,
	};
}

function normalizeRequiredReconcileTargetVersion(toAnimeDbVersion: string): string {
	const normalizedVersion = toAnimeDbVersion.trim();
	if (normalizedVersion.length === 0) {
		throw new Error("Reconcile preflight requires a configured anime DB version.");
	}

	return normalizedVersion;
}

function assertUserGroupingMode(): void {
	if (getUserGroupingState().groupingMode !== "user") {
		throw new Error("Reconcile preflight requires user grouping mode.");
	}
}

// Public preflight operation used by the facade. It owns preconditions and the
// concrete lineage classifier so the facade remains a logging delegate only.
export function runUserGroupingReconcilePreflight(params: {
	fromAnimeDbVersion: string | null;
	toAnimeDbVersion: string;
}): {
	runId: number;
	startedAt: number;
	completedAt: number;
	items: ReconcileLineageItem[];
	summary: ReconcilePreflightSummary;
} {
	assertUserGroupingMode();
	const normalizedToAnimeDbVersion = normalizeRequiredReconcileTargetVersion(params.toAnimeDbVersion);
	repairAndAssertAttachedAnimeDbReconcileSafety();

	const result = runAndPersistReconcilePreflight({
		fromAnimeDbVersion:     params.fromAnimeDbVersion,
		toAnimeDbVersion:       normalizedToAnimeDbVersion,
		readClassifiedLineages: classifyReconcileLineages,
	});
	logGroupingDiagnosticsIfDebuggingEnabled("groupingReconcile.runPreflight");

	return result;
}
