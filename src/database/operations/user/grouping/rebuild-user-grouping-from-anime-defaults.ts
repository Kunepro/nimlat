import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { repairAndAssertAttachedAnimeDbReconcileSafety } from "../../anime/metadata/validate-anime-db-reconcile-safety";
import { getConfigAnimeDbVersion } from "../config/anime-db-version";
import { forkAnimeGroupingToUserSnapshotInternal } from "./fork-anime-grouping-to-user-snapshot";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";
import { supersedePendingReconcileConflictsInternal } from "./reconcile/update-reconcile-conflict-resolution-status";
import { selectAllUserGroupMediaIds } from "./select-all-user-group-media-ids";
import { getUserGroupingState } from "./user-grouping-state";

function requireConfiguredAnimeDbVersion(): string {
	const animeDbVersion = getConfigAnimeDbVersion();
	if (typeof animeDbVersion !== "string" || animeDbVersion.trim().length === 0) {
		throw new Error("Rebuilding user grouping from anime defaults requires a configured anime DB version.");
	}

	return animeDbVersion.trim();
}

function assertUserGroupingMode(): void {
	if (getUserGroupingState().groupingMode !== "user") {
		throw new Error("Rebuilding user grouping from anime defaults requires user grouping mode.");
	}
}

// Replace the current forked user grouping snapshot with a fresh copy of the current anime defaults.
//
// This keeps user mode active but abandons all grouping customizations in favor of the current
// anime_data shape. Historical reconcile conflicts are preserved and marked superseded.
export function rebuildUserGroupingFromAnimeDefaults(): GroupingMutationImpactDto {
	const db = getDatabase();
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: [],
		affectedGroupIds: [],
	};

	db.transaction(() => {
		assertUserGroupingMode();
		repairAndAssertAttachedAnimeDbReconcileSafety();
		requireConfiguredAnimeDbVersion();
		const affectedMediaIdsBeforeRebuild = selectAllUserGroupMediaIds();

		forkAnimeGroupingToUserSnapshotInternal(db);
		supersedePendingReconcileConflictsInternal(db);

		// Rebuild creates a fresh baseline, so any last reconcile status now describes
		// an obsolete snapshot and should no longer be treated as current state.
		// noinspection SqlResolve
		db.prepare(`
            UPDATE userGroupingState
            SET lastReconciledAnimeDbVersion = NULL,
                lastReconciledAt             = NULL,
                lastReconcileStatus          = NULL,
                lastReconcileSummaryJson     = NULL
            WHERE id = 1
		`).run();

		const affectedMediaIdsAfterRebuild = selectAllUserGroupMediaIds();
		result = {
			affectedMediaIds: [
				...new Set([
					...affectedMediaIdsBeforeRebuild,
					...affectedMediaIdsAfterRebuild,
				]),
			],
			affectedGroupIds: [],
		};
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("rebuildFromCurrentAnimeDefaults");

	return result;
}
