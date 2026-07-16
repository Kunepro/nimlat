import { Subscription } from "rxjs";
import { addGroupExplorerGroupEventBridges } from "./group-explorer-events/group-media-event-bridges";
import { addGroupExplorerEpisodeEventBridges } from "./group-explorer-events/media-episode-event-bridges";

let subscription: Subscription | null = null;

// Producers publish semantic BUS events once, without caring about Electron APIs.
// The domain bridge modules below own coalescing, chunking, and renderer IPC fan-out.
export function initGroupExplorerEventsBridge(): void {
	if (subscription) {
		return;
	}

	const bridgeSubscription = new Subscription();

	addGroupExplorerGroupEventBridges(bridgeSubscription);
	addGroupExplorerEpisodeEventBridges(bridgeSubscription);

	subscription = bridgeSubscription;
}

export function disposeGroupExplorerEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
