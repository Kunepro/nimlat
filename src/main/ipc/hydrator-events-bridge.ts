import {
	BUS_HydratorProgress,
	BUS_HydratorQueueChanges,
} from "@nimlat/busses/main";
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import {
	bufferTime,
	filter,
	map,
	Subscription,
} from "rxjs";
import {
	addMainBusEventBridge,
	createRendererChannelNotifier,
	createRendererSignalNotifier,
	notifyEach,
} from "./main-bus-event-bridge";

const HYDRATOR_QUEUE_RENDERER_BATCH_MS    = 250;
const HYDRATOR_PROGRESS_RENDERER_BATCH_MS = 150;
let subscription: Subscription | null = null;

function collapseHydratorProgressBatch(batch: HydratorProgressEvent[]): HydratorProgressEvent[] {
	const latestByTask = new Map<string, HydratorProgressEvent>();

	batch.forEach((event) => {
		latestByTask.set(
			event.taskId,
			event,
		);
	});

	return Array.from(latestByTask.values());
}

// Bridges internal hydrator buses to renderer IPC notifications.
// Renderer delivery is intentionally coalesced because overnight hydration can
// emit short-lived task bursts faster than the UI needs to animate each edge.
export function initHydratorEventsBridge(): void {
	if (subscription) {
		return;
	}

	const bridgeSubscription = new Subscription();

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_HydratorQueueChanges.pipe(
				bufferTime(HYDRATOR_QUEUE_RENDERER_BATCH_MS),
				filter(batch => batch.length > 0),
			),
			notify:       createRendererSignalNotifier(IpcChannels.MediaHydrationQueueChanged),
			errorContext: "hydrator-events-bridge.queue-changed",
		},
	);

	addMainBusEventBridge(
		bridgeSubscription,
		{
			source$:      BUS_HydratorProgress.pipe(
				bufferTime(HYDRATOR_PROGRESS_RENDERER_BATCH_MS),
				map(collapseHydratorProgressBatch),
				filter(events => events.length > 0),
			),
			notify:       notifyEach(createRendererChannelNotifier(IpcChannels.HydratorProgress)),
			errorContext: "hydrator-events-bridge.progress",
		},
	);

	subscription = bridgeSubscription;
}

export function disposeHydratorEventsBridge(): void {
	subscription?.unsubscribe();
	subscription = null;
}
