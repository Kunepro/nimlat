import type { ReleaseWatchScopeFilter } from "@nimlat/types/release-watch";
import { useState } from "react";
import {
	type ReleaseWatchRow,
	type ReleaseWatchTab,
} from "../release-watch-model";
import { useReleaseWatchActiveControls } from "./useReleaseWatchActiveControls";
import { useReleaseWatchFeeds } from "./useReleaseWatchFeeds";
import { useReleaseWatchNotifications } from "./useReleaseWatchNotifications";

interface UseReleaseWatchControllerResult {
	activeNextOffset: number | null;
	activeRows: ReleaseWatchRow[];
	activeTab: ReleaseWatchTab;
	isLoading: boolean;
	scopeFilter: ReleaseWatchScopeFilter;
	loadMoreActiveRows: () => void;
	refreshActiveRows: () => void;
	selectTab: (tabKey: string) => void;
	setScopeFilter: (scope: ReleaseWatchScopeFilter) => void;
}

export function useReleaseWatchController(): UseReleaseWatchControllerResult {
	const [ activeTab, setActiveTab ]     = useState<ReleaseWatchTab>("upcoming");
	const [ scopeFilter, setScopeFilter ] = useState<ReleaseWatchScopeFilter>("tracked");
	const notifications                   = useReleaseWatchNotifications();
	const feeds                           = useReleaseWatchFeeds(
		scopeFilter,
		notifications,
	);
	const activeControls                  = useReleaseWatchActiveControls({
		activeTab,
		feeds,
		notifyReleaseWatchError: notifications.notifyReleaseWatchError,
		setActiveTab,
	});

	return {
		activeTab,
		scopeFilter,
		setScopeFilter,
		...activeControls,
	};
}
