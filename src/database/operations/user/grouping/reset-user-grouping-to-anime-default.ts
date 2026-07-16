import { getDatabase } from "../../../utils/get-db";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Clear the forked grouping snapshot and flip grouping mode back to anime defaults
// in one atomic transaction.
//
// What is cleared: all user-owned grouping rows (userGroups, userGroupMedias,
// userGroupLineages, userGroupStates, userGroupIntegrationSnapshots, the
// current group-id keyed aggregate tables) and the fork metadata stored in
// userGroupingState.
//
// What is preserved: metadata overrides (userGroupOverrides, userMediaOverrides,
// userEpisodeOverrides), episode/media integration state, playback issue state,
// and reconcile run history.
export function resetUserGroupingToAnimeDefault(): void {
	const db = getDatabase();

	db.transaction(() => {
		// noinspection SqlResolve,SqlWithoutWhere -- this explicit reset clears the complete user-owned snapshot.
		db.prepare(`DELETE FROM userGroupMedias`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userGroupStates`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userGroupIntegrationSnapshots`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userAnimeGroupStates`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userAnimeGroupIntegrationSnapshots`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userCustomGroupStates`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userCustomGroupIntegrationSnapshots`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userGroupLineages`).run();
		// noinspection SqlResolve,SqlWithoutWhere
		db.prepare(`DELETE FROM userGroups`).run();

		// noinspection SqlResolve
		db.prepare(`
            INSERT INTO userGroupingState (id,
                                           groupingMode,
                                           forkedFromAnimeDbVersion,
                                           lastReconciledAnimeDbVersion,
                                           lastReconciledAt,
                                           lastReconcileStatus,
                                           lastReconcileSummaryJson)
            VALUES (1, 'anime', NULL, NULL, NULL, NULL, NULL)
            ON CONFLICT(id) DO UPDATE SET groupingMode                 = excluded.groupingMode,
                                          forkedFromAnimeDbVersion     = excluded.forkedFromAnimeDbVersion,
                                          lastReconciledAnimeDbVersion = excluded.lastReconciledAnimeDbVersion,
                                          lastReconciledAt             = excluded.lastReconciledAt,
                                          lastReconcileStatus          = excluded.lastReconcileStatus,
                                          lastReconcileSummaryJson     = excluded.lastReconcileSummaryJson
			`).run();
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("resetToAnimeGrouping");
}
