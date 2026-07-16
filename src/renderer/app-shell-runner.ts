import type { BackgroundStyle } from "@nimlat/types/user-config";
import type { Observable } from "rxjs";
import { UserConfigFacade } from "./facades";

// Renderer shell boundary for persisted app preferences. App.tsx owns timing and
// React state; facade calls stay here so shell behavior is easy to test.
export function persistLastRoute(route: string): Promise<void> {
	return UserConfigFacade.setLastRoute(route);
}

export function loadBackgroundStyle(): Promise<BackgroundStyle> {
	return UserConfigFacade.getBackgroundStyle();
}

export function backgroundStyleChanges(): Observable<BackgroundStyle> {
	return UserConfigFacade.backgroundStyleChanges();
}
