import type { Observable } from "rxjs";
import { UserConfigFacade } from "./facades";

// Developer-only diagnostics are gated by persisted user config. Hooks own the
// UI lifecycle; this runner owns the facade reads and event stream.
export function loadDevModeStatus(): Promise<boolean> {
	return UserConfigFacade.getDevModeStatus();
}

export function loadCanvasDiagnosticsStatus(): Promise<boolean> {
	return UserConfigFacade.getCanvasDiagnosticsStatus();
}

export function canvasDiagnosticsStatusChanges(): Observable<boolean> {
	return UserConfigFacade.canvasDiagnosticsStatusChanges();
}
