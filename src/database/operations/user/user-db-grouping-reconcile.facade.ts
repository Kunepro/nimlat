import {
	ReconcileApplyExecutionResult,
	ReconcileLineageItem,
	ReconcilePreflightSummary,
} from "@nimlat/types/anime-db";
import { applySafeUserGroupingReconcile } from "./grouping/reconcile/apply-safe-user-grouping-reconcile";
import { runUserGroupingReconcilePreflight } from "./grouping/reconcile/reconcile-run-operations";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Facade panel for grouping reconcile runs. The safety policy stays inside the
// reconcile operations; callers get one stable DB boundary for dry-run and apply.
export const UserDbGroupingReconcileFacade = {
	// Dry-run classification against current anime_data lineages. No user grouping rows are modified.
	runPreflight: (
									fromAnimeDbVersion: string | null,
		              toAnimeDbVersion: string,
								): {
		runId: number;
		startedAt: number;
		completedAt: number;
		items: ReconcileLineageItem[];
		summary: ReconcilePreflightSummary;
	} => {
		return runUserDbFacadeOperation(
			"user-db.facade.groupingReconcile.runPreflight",
			() => runUserGroupingReconcilePreflight({
				fromAnimeDbVersion,
				toAnimeDbVersion,
			}),
			{
				fromAnimeDbVersion,
				toAnimeDbVersion,
			},
		);
	},

	// Apply only the safe-import reconcile path and persist grouping reconcile state.
	applySafeImport: (
										 fromAnimeDbVersion: string | null,
		                 toAnimeDbVersion: string,
									 ): ReconcileApplyExecutionResult => {
		return runUserDbFacadeOperation(
			"user-db.facade.groupingReconcile.applySafeImport",
			() => applySafeUserGroupingReconcile({
				fromAnimeDbVersion,
				toAnimeDbVersion,
			}),
			{
				fromAnimeDbVersion,
				toAnimeDbVersion,
			},
		);
	},
} as const;
