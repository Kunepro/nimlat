import type {
	PastReleaseWatchPage,
	ReleaseWatchListChangedEvent,
	ReleaseWatchScopeFilter,
	UpcomingReleaseWatchPage,
} from "./release-watch";

// Release watch reads are paged and invalidated by list-level events, keeping
// renderer state derived from DB-backed read models.
export interface ReleaseWatchElectronApi {
	listPast(scope?: ReleaseWatchScopeFilter, limit?: number, offset?: number): Promise<PastReleaseWatchPage>;

	listUpcoming(scope?: ReleaseWatchScopeFilter, limit?: number, offset?: number): Promise<UpcomingReleaseWatchPage>;

	onPastListChanged(callback: (event: ReleaseWatchListChangedEvent) => void): () => void;

	onUpcomingListChanged(callback: (event: ReleaseWatchListChangedEvent) => void): () => void;
}
