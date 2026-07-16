import { UserDbFacade } from "@nimlat/database";
import type {
	ReleaseWatchMediaFactsDto,
	UserReleaseWatchStateDto,
	UserScheduledMediaRefreshDto,
} from "@nimlat/types/anime-db";
import { ReleaseDateResolver } from "./release-date-resolver";
import {
	isFullyIntegrated,
	RELEASE_REFRESH_GRACE_MS,
	serializePayload,
} from "./release-watch-utils";

// Refresh one materialized release-watch row from current catalog facts. Keeping this
// outside the coordinator prevents list orchestration from knowing every state payload detail.
export function refreshReleaseWatchStateForInterestMedia(
	facts: ReleaseWatchMediaFactsDto,
	now: number,
): void {
	const resolved = ReleaseDateResolver.resolveMediaDto(facts);

	if (resolved.resolvedReleaseAt && resolved.resolvedReleaseAt > now) {
		UserDbFacade.releaseWatch.saveState({
			mediaId:     facts.mediaId,
			watchDomain: "upcoming",
			state:       resolved.releaseDateSource === "next_airing_episode"
										 ? "upcoming_episode_release"
										 : "upcoming_media_release",
			...resolved,
			lastCatalogRefreshAt: facts.lastRefreshAt ?? now,
			payloadJson:          serializePayload({ mediaName: facts.name }),
			updatedAt:            now,
		});
		UserDbFacade.releaseWatch.saveScheduledRefresh({
			mediaId:                      facts.mediaId,
			releaseWatchReason:           "release_window",
			scheduledReleaseAt:           resolved.resolvedReleaseAt,
			nextAttemptAt:                resolved.resolvedReleaseAt + RELEASE_REFRESH_GRACE_MS,
			attemptCount:                 0,
			lastOutcome:                  "pending",
			cooldownUntil:                null,
			lastAttemptAt:                null,
			lastObservedCatalogStateHash: null,
			updatedAt:                    now,
		});
		return;
	}

	UserDbFacade.releaseWatch.deleteState(
		facts.mediaId,
		"upcoming",
	);

	if (resolved.resolvedReleaseAt && !isFullyIntegrated(facts)) {
		UserDbFacade.releaseWatch.saveState({
			mediaId:     facts.mediaId,
			watchDomain: "past",
			state:       "released_needs_integration",
			...resolved,
			lastObservedReleaseAt: resolved.resolvedReleaseAt,
			lastCatalogRefreshAt:  facts.lastRefreshAt ?? now,
			payloadJson:           serializePayload({ mediaName: facts.name }),
			updatedAt:             now,
		});
		return;
	}

	UserDbFacade.releaseWatch.deleteState(
		facts.mediaId,
		"past",
	);
}

export function savePastStateFromScheduledRefresh(
	refresh: UserScheduledMediaRefreshDto,
	state: UserReleaseWatchStateDto["state"],
	now: number,
	errorMessage?: string,
): void {
	// A due release-window refresh has crossed out of the future calendar even
	// when provider/catalog facts lag behind. Keep the retry visible in Past, not
	// duplicated across Past and Upcoming.
	UserDbFacade.releaseWatch.deleteState(
		refresh.mediaId,
		"upcoming",
	);
	UserDbFacade.releaseWatch.saveState({
		mediaId:               refresh.mediaId,
		watchDomain:           "past",
		state,
		resolvedReleaseAt:     refresh.scheduledReleaseAt,
		releaseDatePrecision:  "timestamp",
		releaseDateSource:     "provider_release_at",
		lastObservedReleaseAt: refresh.scheduledReleaseAt,
		payloadJson:           serializePayload({ errorMessage }),
		updatedAt:             now,
	});
}
