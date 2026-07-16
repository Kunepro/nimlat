import type { SyntheticEvent } from "react";

export function stopTrackingStatusParentNavigation(event: SyntheticEvent<HTMLElement>): void {
	event.preventDefault();
	event.stopPropagation();
}
