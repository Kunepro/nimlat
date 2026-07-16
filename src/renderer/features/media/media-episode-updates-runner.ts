import type {
	MediaEpisodesListChangedEvent,
	MediaEpisodeUpdatesIssue,
	RetryMediaEpisodeUpdatesResult,
} from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import { GroupExplorerFacade } from "../../facades";

// Read/command boundary for the episode-update status widget. The hook owns
// current-media filtering and retry UI state; this runner only touches IPC.
export function getMediaEpisodeUpdatesIssue(mediaId: number): Promise<MediaEpisodeUpdatesIssue | null> {
	return GroupExplorerFacade.getMediaEpisodeUpdatesIssue(mediaId);
}

export function mediaEpisodeUpdatesListChanges(): Observable<MediaEpisodesListChangedEvent> {
	return GroupExplorerFacade.mediaEpisodesListChanges();
}

export function retryMediaEpisodeUpdates(mediaId: number): Promise<RetryMediaEpisodeUpdatesResult> {
	return GroupExplorerFacade.retryMediaEpisodeUpdates(mediaId);
}
