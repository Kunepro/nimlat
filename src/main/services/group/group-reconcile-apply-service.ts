import { UserDbFacade } from "@nimlat/database";
import type { ReconcileApplySummaryReport } from "@nimlat/types/anime-db";
import { LibrarySideEffectsCoordinator } from "../library/library-side-effects-coordinator";

/**
 * Domain service for the Phase 19 safe reconcile apply stage.
 *
 * This service keeps the renderer contract bounded while centralizing the side effects that must
 * follow any user-visible grouping mutation.
 */
export class GroupReconcileApplyService {
	/**
	 * Run reconcile preflight plus the safe auto-import stage for the current user snapshot.
	 * Throws when the app is not in user grouping mode or when any DB step fails.
	 */
	public static runSafeApply(): ReconcileApplySummaryReport {
		const state = UserDbFacade.grouping.getState();

		if (state.groupingMode !== "user") {
			throw new Error("Reconcile apply requires user grouping mode.");
		}

		const fromAnimeDbVersion = state.forkedFromAnimeDbVersion ?? null;
		const toAnimeDbVersion = GroupReconcileApplyService.requireConfiguredAnimeDbVersion();
		const result           = UserDbFacade.groupingReconcile.applySafeImport(
			fromAnimeDbVersion,
			toAnimeDbVersion,
		);

		LibrarySideEffectsCoordinator.handleGroupingMutation({
			affectedMediaIds: result.impact.affectedMediaIds,
			affectedGroups: result.impact.affectedGroupIds.map((groupId) => ({
				source: "user" as const,
				groupId,
			})),
			context:        "group-reconcile-safe-apply",
		});

		return result.report;
	}

	/**
	 * Safe apply must record which stamped anime DB revision it imported from.
	 */
	private static requireConfiguredAnimeDbVersion(): string {
		const version = UserDbFacade.config.getAnimeDbVersion();
		if (typeof version !== "string" || version.trim().length === 0) {
			throw new Error("Reconcile apply requires a configured anime DB version.");
		}

		return version.trim();
	}
}
