import type { ReleaseWatchScopeFilter } from "@nimlat/types/release-watch";
import { ReleaseWatchFacade } from "../../facades";

// Shared renderer read surface for release-watch pages. Hooks own pagination,
// stale-response guards, and errors; this runner owns facade calls and event streams.
export function listPastReleaseWatchPage(
	scopeFilter: ReleaseWatchScopeFilter,
	limit: number,
	offset: number,
) {
	return ReleaseWatchFacade.listPast(
		scopeFilter,
		limit,
		offset,
	);
}

export function listUpcomingReleaseWatchPage(
	scopeFilter: ReleaseWatchScopeFilter,
	limit: number,
	offset: number,
) {
	return ReleaseWatchFacade.listUpcoming(
		scopeFilter,
		limit,
		offset,
	);
}

export function pastReleaseWatchListChanges() {
	return ReleaseWatchFacade.pastListChanges();
}

export function upcomingReleaseWatchListChanges() {
	return ReleaseWatchFacade.upcomingListChanges();
}
