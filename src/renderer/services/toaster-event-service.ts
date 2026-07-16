import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class ToasterEventServiceImpl {
	private readonly messages$ = createSharedPreloadEventStream<ToasterMessageEvent>(
		(listener) => window.electronAPI.toaster.onToasterMessage(listener),
	);

	public messages(): Observable<ToasterMessageEvent> {
		return this.messages$;
	}
}

export const ToasterEventService = new ToasterEventServiceImpl();
