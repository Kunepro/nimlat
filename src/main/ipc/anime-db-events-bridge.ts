import {
	BUS_AnimeDbDownloadProgress,
	BUS_AnimeDbUpdateProgress,
	BUS_PopulateAnimeDbProgress,
} from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subscription } from "rxjs";
import {
	addMainBusEventBridge,
	createRendererChannelNotifier,
} from "./main-bus-event-bridge";

let subscription: Subscription | null = null;

// Bridges AnimeDB workflow progress buses to renderer IPC. The download/update/populate
// services stay focused on state transitions and never depend on Electron windows.
export function initAnimeDbEventsBridge(): void {
	if (subscription) {
		return;
	}

	const bridgeSubscription = new Subscription();

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_AnimeDbDownloadProgress,
			notify:       createRendererChannelNotifier(IpcChannels.AnimeDbDownloadProgress),
			errorContext: "anime-db-events-bridge.download-progress",
		},
	);

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_AnimeDbUpdateProgress,
			notify:       createRendererChannelNotifier(IpcChannels.AnimeDbUpdateProgress),
			errorContext: "anime-db-events-bridge.update-progress",
		},
	);

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_PopulateAnimeDbProgress,
			notify:       createRendererChannelNotifier(IpcChannels.PopulateAnimeDbProgress),
			errorContext: "anime-db-events-bridge.populate-progress",
		},
	);

	subscription = bridgeSubscription;
}

export function disposeAnimeDbEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
