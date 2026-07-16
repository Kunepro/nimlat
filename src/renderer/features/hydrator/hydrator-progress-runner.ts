import type { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import { HydratorFacade } from "../../facades";

// Single renderer-side control surface for hydrator progress reads and events.
// UI hooks own animation lifecycle; this runner only talks to preload/IPC.
export function getHydratorProgressSnapshot(): Promise<HydratorProgressEvent[]> {
	return HydratorFacade.getProgressSnapshot();
}

export function hydratorProgressChanges(): Observable<HydratorProgressEvent> {
	return HydratorFacade.progressChanges();
}
