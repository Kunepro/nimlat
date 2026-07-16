import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { Observable } from "rxjs";
import { Subscription } from "rxjs";
import { broadcastToRendererWindows } from "../utils/ipc-broadcast";

interface MainBusEventBridge<TEvent> {
	source$: Observable<TEvent>;
	notify: (event: TEvent) => void;
	errorContext: string;
}

// Centralized subscription policy for main BUS -> renderer IPC bridges.
// Bridge files should describe pipelines; logging, rethrow-free subscription
// wiring, and renderer channel fan-out stay uniform here.
export function subscribeMainBusEventBridge<TEvent>({
																											source$,
																											notify,
																											errorContext,
																										}: MainBusEventBridge<TEvent>): Subscription {
	return source$.subscribe({
		next:  notify,
		error: (error) => LoggerUtils.logMainServiceError(
			errorContext,
			typeSafeError(error),
		),
	});
}

export function addMainBusEventBridge<TEvent>(
	subscription: Subscription,
	bridge: MainBusEventBridge<TEvent>,
): void {
	subscription.add(subscribeMainBusEventBridge(bridge));
}

export function createRendererChannelNotifier<TEvent>(channel: IpcChannels): (event: TEvent) => void {
	return (event) => {
		broadcastToRendererWindows(
			channel,
			event,
		);
	};
}

export function createRendererSignalNotifier(channel: IpcChannels): () => void {
	return () => {
		broadcastToRendererWindows(channel);
	};
}

export function notifyEach<TEvent>(notify: (event: TEvent) => void): (events: TEvent[]) => void {
	return (events) => {
		events.forEach((event) => {
			notify(event);
		});
	};
}
