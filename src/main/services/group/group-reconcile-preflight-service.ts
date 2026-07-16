import { UserDbFacade } from "@nimlat/database";
import type { ReconcilePreflightReport } from "@nimlat/types/anime-db";

/**
 * Domain service for the reconcile preflight dry-run.
 *
 * Reads the current grouping state, runs the upstream lineage classification against anime_data,
 * persists the reconcile run record plus conflict rows, and returns the full main-process report.
 *
 * No user grouping tables (userGroups, userGroupMedias, userGroupLineages) are mutated during
 * this flow. Renderer-facing callers should only receive the bounded summary projection.
 */
export class GroupReconcilePreflightService {
	/**
	 * Run the preflight classification for the current forked user grouping snapshot.
	 * Throws if the app is not currently in user-grouping mode or if the DB call fails.
	 */
	public static runPreflight(): ReconcilePreflightReport {
		const state = UserDbFacade.grouping.getState();

		if (state.groupingMode !== "user") {
			throw new Error("Reconcile preflight requires user grouping mode.");
		}

		const fromAnimeDbVersion = state.forkedFromAnimeDbVersion ?? null;
		const toAnimeDbVersion = GroupReconcilePreflightService.requireConfiguredAnimeDbVersion();
		const {
						runId,
						startedAt,
						completedAt,
						items,
						summary,
					}                = UserDbFacade.groupingReconcile.runPreflight(
			fromAnimeDbVersion,
			toAnimeDbVersion,
		);

		return {
			runId,
			fromAnimeDbVersion,
			toAnimeDbVersion,
			startedAt,
			completedAt,
			items,
			summary,
		};
	}

	/**
	 * Reconcile reports are only trustworthy when the current anime DB has a real version stamp.
	 */
	private static requireConfiguredAnimeDbVersion(): string {
		const version = UserDbFacade.config.getAnimeDbVersion();
		if (typeof version !== "string" || version.trim().length === 0) {
			throw new Error("Reconcile preflight requires a configured anime DB version.");
		}

		return version.trim();
	}
}
