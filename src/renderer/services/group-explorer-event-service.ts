import type {
	GroupListChangedEvent,
	GroupMediaItemsPatchedEvent,
	GroupMediaListChangedEvent,
	MediaEpisodesItemsPatchedEvent,
	MediaEpisodesListChangedEvent,
} from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class GroupExplorerEventServiceImpl {
	private readonly groupListChanges$ = createSharedPreloadEventStream<GroupListChangedEvent>(
		(listener) => window.electronAPI.groupExplorer.onGroupListChanged(listener),
	);

	private readonly groupMediaListChanges$ = createSharedPreloadEventStream<GroupMediaListChangedEvent>(
		(listener) => window.electronAPI.groupExplorer.onGroupMediaListChanged(listener),
	);

	private readonly groupMediaItemsPatched$ = createSharedPreloadEventStream<GroupMediaItemsPatchedEvent>(
		(listener) => window.electronAPI.groupExplorer.onGroupMediaItemsPatched(listener),
	);

	private readonly mediaEpisodesListChanges$ = createSharedPreloadEventStream<MediaEpisodesListChangedEvent>(
		(listener) => window.electronAPI.groupExplorer.onMediaEpisodesListChanged(listener),
	);

	private readonly mediaEpisodesItemsPatched$ = createSharedPreloadEventStream<MediaEpisodesItemsPatchedEvent>(
		(listener) => window.electronAPI.groupExplorer.onMediaEpisodesItemsPatched(listener),
	);

	public groupListChanges(): Observable<GroupListChangedEvent> {
		return this.groupListChanges$;
	}

	public groupMediaListChanges(): Observable<GroupMediaListChangedEvent> {
		return this.groupMediaListChanges$;
	}

	public groupMediaItemsPatched(): Observable<GroupMediaItemsPatchedEvent> {
		return this.groupMediaItemsPatched$;
	}

	public mediaEpisodesListChanges(): Observable<MediaEpisodesListChangedEvent> {
		return this.mediaEpisodesListChanges$;
	}

	public mediaEpisodesItemsPatched(): Observable<MediaEpisodesItemsPatchedEvent> {
		return this.mediaEpisodesItemsPatched$;
	}
}

export const GroupExplorerEventService = new GroupExplorerEventServiceImpl();
