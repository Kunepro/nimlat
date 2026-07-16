import {
	BUS_ReleaseWatchPastListChanged,
	BUS_ReleaseWatchUpcomingListChanged,
} from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subscription } from "rxjs";
import {
	addMainBusEventBridge,
	createRendererChannelNotifier,
} from "./main-bus-event-bridge";

let subscription: Subscription | null = null;

// Bridges release-watch invalidation buses to renderer IPC notifications.
export function initReleaseWatchEventsBridge(): void {
	if (subscription) {
		return;
	}

	const bridgeSubscription = new Subscription();

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ReleaseWatchPastListChanged,
			notify:       createRendererChannelNotifier(IpcChannels.ReleaseWatchPastListChanged),
			errorContext: "release-watch-events-bridge.past-list-changed",
		},
	);

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ReleaseWatchUpcomingListChanged,
			notify:       createRendererChannelNotifier(IpcChannels.ReleaseWatchUpcomingListChanged),
			errorContext: "release-watch-events-bridge.upcoming-list-changed",
		},
	);

	subscription = bridgeSubscription;
}

export function disposeReleaseWatchEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
