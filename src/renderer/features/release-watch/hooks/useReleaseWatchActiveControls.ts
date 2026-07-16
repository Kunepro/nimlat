import type {
	Dispatch,
	SetStateAction,
} from "react";
import {
	useCallback,
	useMemo,
} from "react";
import {
	isReleaseWatchTab,
	type ReleaseWatchRow,
	type ReleaseWatchTab,
} from "../release-watch-model";
import type { ReleaseWatchFeeds } from "./useReleaseWatchFeeds";

interface ReleaseWatchActiveControlsInput {
	activeTab: ReleaseWatchTab;
	feeds: ReleaseWatchFeeds;
	notifyReleaseWatchError: (error: unknown, fallbackMessage: string) => void;
	setActiveTab: Dispatch<SetStateAction<ReleaseWatchTab>>;
}

interface ReleaseWatchActiveControls {
	activeNextOffset: number | null;
	activeRows: ReleaseWatchRow[];
	isLoading: boolean;
	loadMoreActiveRows: () => void;
	refreshActiveRows: () => void;
	selectTab: (tabKey: string) => void;
}

// Maps tab state to the active feed commands. Loading and pagination remain
// feed-owned; this hook only chooses the domain that a page action targets.
export function useReleaseWatchActiveControls({
																								activeTab,
																								feeds,
																								notifyReleaseWatchError,
																								setActiveTab,
																							}: ReleaseWatchActiveControlsInput): ReleaseWatchActiveControls {
	const activeRows = useMemo<ReleaseWatchRow[]>(
		() => activeTab === "past" ? feeds.past.rows : feeds.upcoming.rows,
		[
			activeTab,
			feeds.past.rows,
			feeds.upcoming.rows,
		],
	);

	const activeNextOffset = activeTab === "past" ? feeds.past.nextOffset : feeds.upcoming.nextOffset;
	const isLoading        = feeds.past.isLoading || feeds.upcoming.isLoading;

	const selectTab = useCallback(
		(tabKey: string) => {
			if (isReleaseWatchTab(tabKey)) {
				setActiveTab(tabKey);
			}
		},
		[ setActiveTab ],
	);

	const refreshActiveRows = useCallback(
		() => {
			void (activeTab === "past" ? feeds.past.loadRows() : feeds.upcoming.loadRows())
				.catch((error: unknown) => notifyReleaseWatchError(
					error,
					"Failed to reload release watch.",
				));
		},
		[
			activeTab,
			feeds.past,
			feeds.upcoming,
			notifyReleaseWatchError,
		],
	);

	const loadMoreActiveRows = useCallback(
		() => {
			if (activeNextOffset == null) {
				return;
			}
			void (activeTab === "past"
				? feeds.past.loadRows(activeNextOffset)
				: feeds.upcoming.loadRows(activeNextOffset))
				.catch((error: unknown) => notifyReleaseWatchError(
					error,
					"Failed to load more release-watch rows.",
				));
		},
		[
			activeNextOffset,
			activeTab,
			feeds.past,
			feeds.upcoming,
			notifyReleaseWatchError,
		],
	);

	return {
		activeNextOffset,
		activeRows,
		isLoading,
		loadMoreActiveRows,
		refreshActiveRows,
		selectTab,
	};
}
