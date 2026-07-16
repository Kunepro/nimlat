import { useSyncExternalStore } from "react";
import { NetworkFacade } from "../facades";

export function useNetworkStatus(): boolean {
	return useSyncExternalStore(
		(listener) => {
			const subscription = NetworkFacade.statusChanges().subscribe(listener);
			return () => subscription.unsubscribe();
		},
		() => NetworkFacade.getSnapshot(),
		() => NetworkFacade.getSnapshot(),
	);
}
