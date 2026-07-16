import type { ReleaseWatchListChangedEvent } from "@nimlat/types/release-watch";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class ReleaseWatchEventServiceImpl {
	private readonly pastListChanges$ = createSharedPreloadEventStream<ReleaseWatchListChangedEvent>(
		(listener) => window.electronAPI.releaseWatch.onPastListChanged(listener),
	);

	private readonly upcomingListChanges$ = createSharedPreloadEventStream<ReleaseWatchListChangedEvent>(
		(listener) => window.electronAPI.releaseWatch.onUpcomingListChanged(listener),
	);

	public pastListChanges(): Observable<ReleaseWatchListChangedEvent> {
		return this.pastListChanges$;
	}

	public upcomingListChanges(): Observable<ReleaseWatchListChangedEvent> {
		return this.upcomingListChanges$;
	}
}

export const ReleaseWatchEventService = new ReleaseWatchEventServiceImpl();
