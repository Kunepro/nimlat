import { BUS_AppUpdateStatusChanged } from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subscription } from "rxjs";
import {
	createRendererChannelNotifier,
	subscribeMainBusEventBridge,
} from "./main-bus-event-bridge";

let subscription: Subscription | null = null;

// AppUpdateService owns updater state; this bridge owns renderer delivery.
export function initAppUpdateEventsBridge(): void {
	if (subscription) {
		return;
	}

	subscription = subscribeMainBusEventBridge({
		source$:      BUS_AppUpdateStatusChanged,
		notify:       createRendererChannelNotifier(IpcChannels.AppUpdateStatusChanged),
		errorContext: "app-update-events-bridge.status-changed",
	});
}

export function disposeAppUpdateEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
