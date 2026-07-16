import {
	BUS_ReleaseWatchPastListChanged,
	BUS_ReleaseWatchUpcomingListChanged,
} from "@nimlat/busses/main";
import { UserDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { UserScheduledMediaRefreshDto } from "@nimlat/types/anime-db";
import type { MediaId } from "@nimlat/types/nimlat-ids";
import { ReleaseWatchInterestScopeService } from "./release-watch-interest-scope-service";
import {
	planScheduledRefreshAttempt,
	type ScheduledRefreshAttemptOutcome,
} from "./release-watch-refresh-attempt-model";
import { savePastStateFromScheduledRefresh } from "./release-watch-state-refresh";
import { uniqueMediaIds } from "./release-watch-utils";

interface CatalogMediaMutationReleaseWatchInput {
	affectedMediaIds: MediaId[];
	context: string;
	clearScheduledRefreshes?: boolean;
}

interface ScheduledRefreshAttemptInput {
	refresh: UserScheduledMediaRefreshDto;
	outcome: ScheduledRefreshAttemptOutcome;
	errorMessage?: string;
}

// Central orchestrator for release-watch lifecycle state.
// It keeps refresh/import/integration flows from directly knowing release-watch persistence details.
//
// Release Watch is a calendar of user-relevant titles:
// - every tracked media belongs in the watch scope immediately
// - every non-ignored media related to tracked media also belongs in the watch scope
// - untracking a media removes its derived related rows unless another tracked parent still keeps them alive
//
// The materialized interest table is rebuilt on tracking changes so the calendar never waits for a later
// catalog refresh before showing an ongoing title such as a next-airing episode.
export class ReleaseWatchCoordinator {
	public static tryHandleCatalogMediaMutation(input: CatalogMediaMutationReleaseWatchInput): void {
		try {
			this.handleCatalogMediaMutation(input);
		} catch (error) {
			LoggerUtils.logMainServiceError(
				"release-watch.handle-catalog-media-mutation",
				typeSafeError(error),
				{
					context: input.context,
					affectedMediaIds: input.affectedMediaIds,
				},
			);
		}
	}

	public static tryHandleIntegrationCascade(affectedMediaIds: MediaId[], context: string): void {
		try {
			const uniqueIds = uniqueMediaIds(affectedMediaIds);
			if (uniqueIds.length === 0) {
				return;
			}
			this.rebuildInterestAndRefreshWatchState(
				uniqueIds,
			);
		} catch (error) {
			LoggerUtils.logMainServiceError(
				"release-watch.handle-integration-cascade",
				typeSafeError(error),
				{
					context,
					affectedMediaIds,
				},
			);
		}
	}

	public static handleScheduledRefreshAttempt(input: ScheduledRefreshAttemptInput): void {
		const now  = Date.now();
		const plan = planScheduledRefreshAttempt({
			...input,
			now,
		});

		if (plan.type === "catalog-changed") {
			UserDbFacade.releaseWatch.deleteScheduledRefresh(
				plan.refreshKey.mediaId,
				plan.refreshKey.releaseWatchReason,
				plan.refreshKey.scheduledReleaseAt,
			);
			this.handleCatalogMediaMutation({
				affectedMediaIds: plan.affectedMediaIds,
				context:          "release-watch-daemon",
			});
			return;
		}

		UserDbFacade.releaseWatch.saveScheduledRefresh(plan.nextRefresh);
		savePastStateFromScheduledRefresh(
			plan.nextRefresh,
			plan.pastState,
			now,
			plan.errorMessage,
		);
		this.publishPastChanged(plan.affectedMediaIds);
		this.publishUpcomingChanged(plan.affectedMediaIds);
	}

	private static handleCatalogMediaMutation(input: CatalogMediaMutationReleaseWatchInput): void {
		const mediaIds = uniqueMediaIds(input.affectedMediaIds);
		if (mediaIds.length === 0) {
			return;
		}

		if (input.clearScheduledRefreshes ?? input.context !== "release-watch-daemon") {
			mediaIds.forEach((mediaId) => UserDbFacade.releaseWatch.deleteScheduledRefreshesByMediaId(mediaId));
		}

		this.rebuildInterestAndRefreshWatchState(
			mediaIds,
		);
	}

	private static rebuildInterestAndRefreshWatchState(directlyAffectedMediaIds: MediaId[]): void {
		const affectedMediaIds = ReleaseWatchInterestScopeService.rebuild(directlyAffectedMediaIds);
		this.publishPastChanged(affectedMediaIds);
		this.publishUpcomingChanged(affectedMediaIds);
	}

	private static publishPastChanged(affectedMediaIds: MediaId[]): void {
		BUS_ReleaseWatchPastListChanged.next({ affectedMediaIds });
	}

	private static publishUpcomingChanged(affectedMediaIds: MediaId[]): void {
		BUS_ReleaseWatchUpcomingListChanged.next({ affectedMediaIds });
	}
}
