import type { UserScheduledMediaRefreshDto } from "@nimlat/types/anime-db";
import type { MediaId } from "@nimlat/types/nimlat-ids";
import type {
	ReleaseWatchReason,
	ScheduledMediaRefreshOutcome,
} from "@nimlat/types/release-watch";
import { RELEASE_REFRESH_BACKOFF_MS } from "./release-watch-utils";

export type ScheduledRefreshAttemptOutcome = Extract<
	ScheduledMediaRefreshOutcome,
	"failed" | "refreshed_changed" | "refreshed_no_change"
>;

interface ScheduledRefreshAttemptPlanInput {
	refresh: UserScheduledMediaRefreshDto;
	outcome: ScheduledRefreshAttemptOutcome;
	now: number;
	errorMessage?: string;
}

interface ScheduledRefreshKey {
	mediaId: MediaId;
	releaseWatchReason: ReleaseWatchReason;
	scheduledReleaseAt: number;
}

interface CatalogChangedRefreshPlan {
	type: "catalog-changed";
	affectedMediaIds: MediaId[];
	refreshKey: ScheduledRefreshKey;
}

interface RetryRefreshPlan {
	type: "retry";
	affectedMediaIds: MediaId[];
	errorMessage?: string;
	nextRefresh: UserScheduledMediaRefreshDto;
	pastState: "released_retry_scheduled";
}

export type ScheduledRefreshAttemptPlan =
	| CatalogChangedRefreshPlan
	| RetryRefreshPlan;

// Pure retry/backoff policy for release-window refreshes. The coordinator owns
// persistence and BUS events; this model owns only the state transition decision.
export function planScheduledRefreshAttempt(input: ScheduledRefreshAttemptPlanInput): ScheduledRefreshAttemptPlan {
	if (input.outcome === "refreshed_changed") {
		return {
			type:             "catalog-changed",
			affectedMediaIds: [ input.refresh.mediaId ],
			refreshKey:       {
				mediaId:            input.refresh.mediaId,
				releaseWatchReason: input.refresh.releaseWatchReason,
				scheduledReleaseAt: input.refresh.scheduledReleaseAt,
			},
		};
	}

	const nextAttempt   = input.refresh.attemptCount + 1;
	const isExhausted   = nextAttempt >= RELEASE_REFRESH_BACKOFF_MS.length;
	const backoffMs     = RELEASE_REFRESH_BACKOFF_MS[ Math.min(
		input.refresh.attemptCount,
		RELEASE_REFRESH_BACKOFF_MS.length - 1,
	) ];
	const nextAttemptAt = input.now + backoffMs;
	const lastOutcome   = isExhausted
		? input.outcome === "failed" ? "failed" : "retry_exhausted"
		: input.outcome;

	return {
		type:             "retry",
		affectedMediaIds: [ input.refresh.mediaId ],
		errorMessage:     input.errorMessage,
		nextRefresh:      {
			...input.refresh,
			attemptCount:  nextAttempt,
			lastAttemptAt: input.now,
			lastOutcome,
			nextAttemptAt,
			cooldownUntil: isExhausted ? null : nextAttemptAt,
			updatedAt:     input.now,
		},
		pastState:        "released_retry_scheduled",
	};
}
