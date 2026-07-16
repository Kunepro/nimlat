import type {
	ReconcileApplySummaryReport,
	ReconcilePreflightSummaryReport,
} from "./anime-db-reconcile";

// Reconcile actions stay summary-only so the renderer never receives unbounded
// dry-run/apply payloads. Detailed lineage rows remain in main/DB storage.
export type ReconcilePreflightActionResult =
	| { success: true; report: ReconcilePreflightSummaryReport }
	| { success: false; error: string };

export type ReconcileApplyActionResult =
	| { success: true; report: ReconcileApplySummaryReport }
	| { success: false; error: string };
