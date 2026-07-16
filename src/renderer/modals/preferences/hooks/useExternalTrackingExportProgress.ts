import type { ExternalTrackingExportProgressEvent } from "@nimlat/types/external-tracking";
import {
	useEffect,
	useState,
} from "react";
import { subscribeToExternalTrackingExportProgress } from "../external-tracking-preferences-runner";

// Export progress is deliberately transient renderer state. The main process
// publishes it only while the user-triggered Kitsu export promise is active.
export function useExternalTrackingExportProgress(): ExternalTrackingExportProgressEvent | null {
	const [ progress, setProgress ] = useState<ExternalTrackingExportProgressEvent | null>(null);

	useEffect(
		() => {
			const subscription = subscribeToExternalTrackingExportProgress((event) => {
				setProgress(event.active ? event : null);
			});
			return () => subscription.unsubscribe();
		},
		[],
	);

	return progress;
}
