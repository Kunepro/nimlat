import {
	BUS_ConfigAdultContentChanged,
	BUS_ConfigBackgroundStyleChanged,
	BUS_ConfigCanvasDiagnosticsChanged,
	BUS_ConfigPreferredTitleLanguageChanged,
} from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subscription } from "rxjs";
import {
	addMainBusEventBridge,
	createRendererChannelNotifier,
} from "./main-bus-event-bridge";

let subscription: Subscription | null = null;

// Config writes publish semantic BUS events; this bridge owns the renderer IPC
// fan-out so settings services stay decoupled from Electron windows.
export function initConfigEventsBridge(): void {
	if (subscription) {
		return;
	}

	const bridgeSubscription = new Subscription();

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ConfigAdultContentChanged,
			notify:       createRendererChannelNotifier(IpcChannels.ConfigAdultContentChanged),
			errorContext: "config-events-bridge.adult-content-changed",
		},
	);

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ConfigBackgroundStyleChanged,
			notify:       createRendererChannelNotifier(IpcChannels.ConfigBackgroundStyleChanged),
			errorContext: "config-events-bridge.background-style-changed",
		},
	);

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ConfigPreferredTitleLanguageChanged,
			notify:       createRendererChannelNotifier(IpcChannels.ConfigPreferredTitleLanguageChanged),
			errorContext: "config-events-bridge.preferred-title-language-changed",
		},
	);

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_ConfigCanvasDiagnosticsChanged,
			notify:       createRendererChannelNotifier(IpcChannels.ConfigCanvasDiagnosticsChanged),
			errorContext: "config-events-bridge.canvas-diagnostics-changed",
		},
	);

	subscription = bridgeSubscription;
}

export function disposeConfigEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
