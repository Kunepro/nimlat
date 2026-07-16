import { BUS_ToasterMessage } from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subscription } from "rxjs";
import {
	createRendererChannelNotifier,
	subscribeMainBusEventBridge,
} from "./main-bus-event-bridge";

let subscription: Subscription | null = null;

// Toast intent is published by main services, while this bridge owns the
// renderer IPC fan-out so feature services stay window-agnostic.
export function initToasterEventsBridge(): void {
	if (subscription) {
		return;
	}

	subscription = subscribeMainBusEventBridge({
		source$:      BUS_ToasterMessage,
		notify:       createRendererChannelNotifier(IpcChannels.ToasterMessage),
		errorContext: "toaster-events-bridge.message",
	});
}

export function disposeToasterEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
