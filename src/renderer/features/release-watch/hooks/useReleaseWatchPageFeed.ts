import type { ReleaseWatchScopeFilter } from "@nimlat/types/release-watch";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Observable } from "rxjs";
import { useIsMountedRef } from "../../../hooks";
import {
	mergeReleaseWatchPageRows,
	RELEASE_WATCH_PAGE_LIMIT,
} from "../release-watch-model";

interface ReleaseWatchPage<TRow> {
	items: TRow[];
	nextOffset: number | null;
}

interface UseReleaseWatchPageFeedOptions<TRow> {
	onLoadError: (error: unknown) => void;
	onRefreshError: (error: unknown) => void;
	scopeFilter: ReleaseWatchScopeFilter;
	listPage: (scopeFilter: ReleaseWatchScopeFilter, limit: number, offset: number) => Promise<ReleaseWatchPage<TRow>>;
	listChanges: Observable<unknown>;
}

export interface UseReleaseWatchPageFeedResult<TRow> {
	isLoading: boolean;
	nextOffset: number | null;
	rows: TRow[];
	loadRows: (offset?: number) => Promise<void>;
}

// Bounded release-watch feed for one tab. It owns stale request filtering so
// late responses from an older scope cannot replace the current tab data.
export function useReleaseWatchPageFeed<TRow>({
																								listPage,
																								onLoadError,
																								onRefreshError,
																								scopeFilter,
																								listChanges,
																							}: UseReleaseWatchPageFeedOptions<TRow>): UseReleaseWatchPageFeedResult<TRow> {
	const [ rows, setRows ]                               = useState<TRow[]>([]);
	const [ nextOffset, setNextOffset ]                   = useState<number | null>(null);
	const [ loadingRequestCount, setLoadingRequestCount ] = useState(0);
	const requestIdRef                                    = useRef(0);
	const scopeFilterRef                                  = useRef(scopeFilter);
	const isMountedRef                                    = useIsMountedRef();
	scopeFilterRef.current                                = scopeFilter;

	const beginLoading = useCallback(
		() => setLoadingRequestCount((count) => count + 1),
		[],
	);

	const finishLoading = useCallback(
		() => setLoadingRequestCount((count) => Math.max(
			0,
			count - 1,
		)),
		[],
	);

	const loadRows = useCallback(
		async (offset: number = 0): Promise<void> => {
			const requestId      = requestIdRef.current + 1;
			const requestScope   = scopeFilter;
			requestIdRef.current = requestId;
			beginLoading();
			try {
				const page = await listPage(
					requestScope,
					RELEASE_WATCH_PAGE_LIMIT,
					offset,
				);
				if (
					!isMountedRef.current
					|| requestId !== requestIdRef.current
					|| requestScope !== scopeFilterRef.current
				) {
					return;
				}
				setRows((current) => mergeReleaseWatchPageRows(
					current,
					page.items,
					offset,
				));
				setNextOffset(page.nextOffset);
			} finally {
				if (isMountedRef.current) {
					finishLoading();
				}
			}
		},
		[
			beginLoading,
			finishLoading,
			isMountedRef,
			listPage,
			scopeFilter,
		],
	);

	useEffect(
		() => {
			void loadRows().catch((error: unknown) => {
				if (isMountedRef.current) {
					onLoadError(error);
				}
			});
		},
		[
			isMountedRef,
			loadRows,
			onLoadError,
		],
	);

	useEffect(
		() => {
			const listSubscription = listChanges.subscribe(() => {
				void loadRows().catch((error: unknown) => {
					if (isMountedRef.current) {
						onRefreshError(error);
					}
				});
			});

			return () => {
				listSubscription.unsubscribe();
			};
		},
		[
			isMountedRef,
			listChanges,
			loadRows,
			onRefreshError,
		],
	);

	return {
		isLoading: loadingRequestCount > 0,
		loadRows,
		nextOffset,
		rows,
	};
}
