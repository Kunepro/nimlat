import { BUS_AniListQueuePaused } from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subscription } from "rxjs";
import {
	createRendererChannelNotifier,
	subscribeMainBusEventBridge,
} from "./main-bus-event-bridge";

let subscription: Subscription | null = null;

// Rate-limiter timing is owned by the AniList API layer; renderer notification
// stays here so provider code remains decoupled from Electron transport.
export function initAniListQueueEventsBridge(): void {
	if (subscription) {
		return;
	}

	subscription = subscribeMainBusEventBridge({
		source$:      BUS_AniListQueuePaused,
		notify:       createRendererChannelNotifier(IpcChannels.AniListQueuePaused),
		errorContext: "ani-list-queue-events-bridge.paused",
	});
}

export function disposeAniListQueueEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
