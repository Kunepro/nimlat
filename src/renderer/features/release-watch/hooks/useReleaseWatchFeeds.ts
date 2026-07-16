import type {
	PastReleaseWatchRow,
	ReleaseWatchScopeFilter,
	UpcomingReleaseWatchRow,
} from "@nimlat/types/release-watch";
import { useMemo } from "react";
import {
	listPastReleaseWatchPage,
	listUpcomingReleaseWatchPage,
	pastReleaseWatchListChanges,
	upcomingReleaseWatchListChanges,
} from "../release-watch-runner";
import { type ReleaseWatchNotifications } from "./useReleaseWatchNotifications";
import {
	useReleaseWatchPageFeed,
	type UseReleaseWatchPageFeedResult,
} from "./useReleaseWatchPageFeed";

export interface ReleaseWatchFeeds {
	past: UseReleaseWatchPageFeedResult<PastReleaseWatchRow>;
	upcoming: UseReleaseWatchPageFeedResult<UpcomingReleaseWatchRow>;
}

// Wires the two release-watch domains to their independent reactive streams.
// The list-change Observables are memoized so tab/filter rerenders do not
// repeatedly tear down subscriptions for unchanged BUS sources.
export function useReleaseWatchFeeds(
	scopeFilter: ReleaseWatchScopeFilter,
	notifications: ReleaseWatchNotifications,
): ReleaseWatchFeeds {
	const pastListChanges     = useMemo(
		() => pastReleaseWatchListChanges(),
		[],
	);
	const upcomingListChanges = useMemo(
		() => upcomingReleaseWatchListChanges(),
		[],
	);

	const past     = useReleaseWatchPageFeed<PastReleaseWatchRow>({
		listPage:       listPastReleaseWatchPage,
		onLoadError:    notifications.notifyPastLoadError,
		onRefreshError: notifications.notifyPastRefreshError,
		scopeFilter,
		listChanges:    pastListChanges,
	});
	const upcoming = useReleaseWatchPageFeed<UpcomingReleaseWatchRow>({
		listPage:       listUpcomingReleaseWatchPage,
		onLoadError:    notifications.notifyUpcomingLoadError,
		onRefreshError: notifications.notifyUpcomingRefreshError,
		scopeFilter,
		listChanges:    upcomingListChanges,
	});

	return {
		past,
		upcoming,
	};
}
