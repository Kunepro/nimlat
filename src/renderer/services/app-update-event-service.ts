import type { AppUpdateStatus } from "@nimlat/types/app-update";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class AppUpdateEventServiceImpl {
	private readonly statusChanges$ = createSharedPreloadEventStream<AppUpdateStatus>(
		(listener) => window.electronAPI.appUpdate.onStatusChanged(listener),
	);

	public statusChanges(): Observable<AppUpdateStatus> {
		return this.statusChanges$;
	}
}

export const AppUpdateEventService = new AppUpdateEventServiceImpl();
