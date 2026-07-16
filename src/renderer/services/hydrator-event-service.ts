import type { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class HydratorEventServiceImpl {
	private readonly queueChanges$ = createSharedPreloadEventStream<void>(
		(listener) => window.electronAPI.hydrator.onQueueChanged(() => {
			listener(undefined);
		}),
	);

	private readonly progress$ = createSharedPreloadEventStream<HydratorProgressEvent>(
		(listener) => window.electronAPI.hydrator.onProgress(listener),
	);

	public queueChanges(): Observable<void> {
		return this.queueChanges$;
	}

	public progressChanges(): Observable<HydratorProgressEvent> {
		return this.progress$;
	}
}

export const HydratorEventService = new HydratorEventServiceImpl();
