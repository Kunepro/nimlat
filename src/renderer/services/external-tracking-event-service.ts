import type {
	ExternalTrackingAccountsChangedEvent,
	ExternalTrackingExportProgressEvent,
} from "@nimlat/types/external-tracking";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class ExternalTrackingEventServiceImpl {
	private readonly accountsChanges$ = createSharedPreloadEventStream<ExternalTrackingAccountsChangedEvent>(
		(listener) => window.electronAPI.externalTracking.onAccountsChanged(listener),
	);
	private readonly exportProgress$ = createSharedPreloadEventStream<ExternalTrackingExportProgressEvent>(
		(listener) => window.electronAPI.externalTracking.onExportProgress(listener),
	);

	public accountsChanges(): Observable<ExternalTrackingAccountsChangedEvent> {
		return this.accountsChanges$;
	}

	public exportProgress(): Observable<ExternalTrackingExportProgressEvent> {
		return this.exportProgress$;
	}
}

export const ExternalTrackingEventService = new ExternalTrackingEventServiceImpl();
