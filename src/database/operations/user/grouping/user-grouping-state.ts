import {
	UserGroupingMode,
	UserGroupingStateDto,
} from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";

type UserGroupingStateRow = {
	id: 1;
	groupingMode: UserGroupingMode;
	forkedFromAnimeDbVersion: string | null;
	lastReconciledAnimeDbVersion: string | null;
	lastReconciledAt: number | null;
	lastReconcileStatus: string | null;
	lastReconcileSummaryJson: string | null;
};

/**
 * Load the singleton grouping-mode state that decides whether visible Group grouping
 * currently resolves from anime defaults or from the forked user snapshot.
 */
export function getUserGroupingState(): UserGroupingStateDto {
	const row = getDatabase()
		// noinspection SqlResolve
		.prepare<[], UserGroupingStateRow>(`
      SELECT
          id,
          groupingMode,
          forkedFromAnimeDbVersion,
          lastReconciledAnimeDbVersion,
          lastReconciledAt,
          lastReconcileStatus,
          lastReconcileSummaryJson
      FROM userGroupingState
      WHERE id = 1
		`)
		.get();

	if (!row) {
		return {
			id:                           1,
			groupingMode:                 "anime",
			forkedFromAnimeDbVersion:     null,
			lastReconciledAnimeDbVersion: null,
			lastReconciledAt:             null,
			lastReconcileStatus:          null,
			lastReconcileSummaryJson:     null,
		};
	}

	return row;
}

/**
 * Persist the singleton grouping-mode state used by future fork/reset/reconcile steps.
 */
export function saveUserGroupingState(state: UserGroupingStateDto): void {
	// noinspection SqlResolve
	getDatabase()
		.prepare<[
			1,
			UserGroupingMode,
				string | null,
				string | null,
				number | null,
				string | null,
				string | null
		]>(`
        INSERT INTO userGroupingState (id,
                                       groupingMode,
                                       forkedFromAnimeDbVersion,
                                       lastReconciledAnimeDbVersion,
                                       lastReconciledAt,
                                       lastReconcileStatus,
                                       lastReconcileSummaryJson)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id)
            DO UPDATE SET groupingMode                 = excluded.groupingMode,
                          forkedFromAnimeDbVersion     = excluded.forkedFromAnimeDbVersion,
                          lastReconciledAnimeDbVersion = excluded.lastReconciledAnimeDbVersion,
                          lastReconciledAt             = excluded.lastReconciledAt,
                          lastReconcileStatus          = excluded.lastReconcileStatus,
                          lastReconcileSummaryJson     = excluded.lastReconcileSummaryJson
		`)
		.run(
			1,
			state.groupingMode,
			state.forkedFromAnimeDbVersion ?? null,
			state.lastReconciledAnimeDbVersion ?? null,
			state.lastReconciledAt ?? null,
			state.lastReconcileStatus ?? null,
			state.lastReconcileSummaryJson ?? null,
		);
}
