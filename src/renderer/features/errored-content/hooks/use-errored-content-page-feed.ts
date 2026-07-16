import type {
	ErroredContentItem,
	ErroredContentQueue,
} from "@nimlat/types/ipc-payloads";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useAppMessage } from "../../../hooks";
import {
	listErroredContentPage,
	subscribeToErroredContentQueueChanges,
} from "../errored-content-runner";
import { mergeErroredContentPageItems } from "../errored-content-state-model";
import { PAGE_LIMIT } from "../errored-content.constants";

interface UseErroredContentPageFeedInput {
	queue: ErroredContentQueue | null;
	showHidden: boolean;
}

interface UseErroredContentPageFeedResult {
	isLoading: boolean;
	items: ErroredContentItem[];
	loadMore: () => Promise<void>;
	loadPage: (offset?: number) => Promise<void>;
	nextOffset: number | null;
	total: number;
}

// Owns failed-content pagination and queue-change refreshes. Page state stays
// DB-backed through the hydrator facade; the parent hook only derives filters.
export function useErroredContentPageFeed({
																						queue,
																						showHidden,
																					}: UseErroredContentPageFeedInput): UseErroredContentPageFeedResult {
	const messageApi                    = useAppMessage();
	const [ items, setItems ]           = useState<ErroredContentItem[]>([]);
	const [ total, setTotal ]           = useState(0);
	const [ nextOffset, setNextOffset ] = useState<number | null>(null);
	const [ isLoading, setIsLoading ]   = useState(false);
	const requestGenerationRef          = useRef(0);

	const isLatestRequest = useCallback(
		(requestGeneration: number) => requestGenerationRef.current === requestGeneration,
		[],
	);

	const loadPage = useCallback(
		async (offset: number = 0): Promise<void> => {
			// Only the newest request can commit page state, otherwise a slow old
			// queue/filter request can overwrite a newer reactive refresh.
			const requestGeneration      = requestGenerationRef.current + 1;
			requestGenerationRef.current = requestGeneration;
			setIsLoading(true);
			try {
				const page = await listErroredContentPage(
					offset,
					PAGE_LIMIT,
					queue,
					showHidden,
				);
				if (!isLatestRequest(requestGeneration)) {
					return;
				}

				setItems(current => mergeErroredContentPageItems(
					current,
					page.items,
					offset,
				));
				setTotal(page.total);
				setNextOffset(page.nextOffset);
			} catch (error) {
				if (isLatestRequest(requestGeneration)) {
					throw error;
				}
			} finally {
				if (isLatestRequest(requestGeneration)) {
					setIsLoading(false);
				}
			}
		},
		[
			isLatestRequest,
			queue,
			showHidden,
		],
	);

	useEffect(
		() => () => {
			requestGenerationRef.current += 1;
		},
		[],
	);

	useEffect(
		() => {
			void loadPage().catch(() => messageApi.error("Failed to load errored content."));
		},
		[
			loadPage,
			messageApi,
		],
	);

	useEffect(
		() => {
			const queueSubscription = subscribeToErroredContentQueueChanges(() => {
				void loadPage().catch(() => messageApi.error("Failed to refresh errored content."));
			});

			return () => {
				queueSubscription.unsubscribe();
			};
		},
		[
			loadPage,
			messageApi,
		],
	);

	const loadMore = useCallback(
		() => nextOffset == null ? Promise.resolve() : loadPage(nextOffset),
		[
			loadPage,
			nextOffset,
		],
	);

	return {
		isLoading,
		items,
		loadMore,
		loadPage,
		nextOffset,
		total,
	};
}
