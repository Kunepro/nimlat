import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import {
	useMemo,
	useState,
} from "react";
import type { QueueFilter } from "../../../types/errored-content";
import {
	getErroredContentQueueFilter,
	getVisibleErroredContentItems,
} from "../errored-content-state-model";
import { useErroredContentActions } from "./use-errored-content-actions";
import { useErroredContentNavigation } from "./use-errored-content-navigation";
import { useErroredContentPageFeed } from "./use-errored-content-page-feed";

export function useErroredContentState(): {
	filter: QueueFilter;
	setFilter: (filter: QueueFilter) => void;
	search: string;
	setSearch: (search: string) => void;
	showHidden: boolean;
	toggleShowHidden: () => void;
	visibleItems: ErroredContentItem[];
	total: number;
	nextOffset: number | null;
	isLoading: boolean;
	isRetryingAll: boolean;
	pendingActionKeys: string[];
	detailItem: ErroredContentItem | null;
	setDetailItem: (item: ErroredContentItem | null) => void;
	loadMore: () => Promise<void>;
	retryItem: (item: ErroredContentItem) => Promise<void>;
	retryAll: () => Promise<void>;
	hideItem: (item: ErroredContentItem) => Promise<void>;
	reportItem: (item: ErroredContentItem) => Promise<void>;
	openMedia: (item: ErroredContentItem) => void;
} {
	const [ filter, setFilter ]         = useState<QueueFilter>("all");
	const [ search, setSearch ]         = useState("");
	const [ showHidden, setShowHidden ] = useState(false);
	const [ detailItem, setDetailItem ] = useState<ErroredContentItem | null>(null);
	const queue                         = getErroredContentQueueFilter(filter);
	const {
					isLoading,
					items,
					loadMore,
					loadPage,
					nextOffset,
					total,
				}                             = useErroredContentPageFeed({
		queue,
		showHidden,
	});

	const {
					isRetryingAll,
					pendingActionKeys,
					retryItem,
					retryAll,
					hideItem,
					reportItem,
				}             = useErroredContentActions({
		queue,
		loadPage,
	});
	const { openMedia } = useErroredContentNavigation();

	const visibleItems = useMemo(
		() => getVisibleErroredContentItems(
			items,
			search,
		),
		[
			items,
			search,
		],
	);
	return {
		filter,
		setFilter,
		search,
		setSearch,
		showHidden,
		toggleShowHidden: () => setShowHidden(current => !current),
		visibleItems,
		total,
		nextOffset,
		isLoading,
		isRetryingAll,
		pendingActionKeys,
		detailItem,
		setDetailItem,
		loadMore,
		retryItem,
		retryAll,
		hideItem,
		reportItem,
		openMedia,
	};
}
