import {
	BUS_ExternalTrackingAccountsChanged,
	BUS_ExternalTrackingExportProgress,
} from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subscription } from "rxjs";
import {
	addMainBusEventBridge,
	createRendererChannelNotifier,
} from "./main-bus-event-bridge";

let subscription: Subscription | null = null;

export function initExternalTrackingEventsBridge(): void {
	if (subscription) {
		return;
	}

	const bridgeSubscription = new Subscription();
	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ExternalTrackingAccountsChanged,
			notify:       createRendererChannelNotifier(IpcChannels.ExternalTrackingAccountsChanged),
			errorContext: "external-tracking-events-bridge.accounts-changed",
		},
	);
	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ExternalTrackingExportProgress,
			notify:       createRendererChannelNotifier(IpcChannels.ExternalTrackingExportProgress),
			errorContext: "external-tracking-events-bridge.export-progress",
		},
	);
	subscription = bridgeSubscription;
}

export function disposeExternalTrackingEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
