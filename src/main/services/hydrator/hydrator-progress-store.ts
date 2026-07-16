import { BUS_HydratorProgress } from "@nimlat/busses/main";
import {
	HydratorProgressEvent,
	HydratorProgressQueue,
} from "@nimlat/types/ipc-payloads";

type PublishHydratorProgressInput = {
	taskId: string;
	queue: HydratorProgressQueue;
	message: string;
};

const activeHydratorTasks = new Map<string, HydratorProgressEvent>();

/**
 * Tracks active hydrator tasks in main memory so late renderer subscribers
 * can request a snapshot and still see work that started before the window mounted.
 */
function buildHydratorProgressEvent(
	input: PublishHydratorProgressInput,
	status: HydratorProgressEvent["status"],
): HydratorProgressEvent {
	const now           = Date.now();
	const existingEvent = activeHydratorTasks.get(input.taskId);

	return {
		taskId:    input.taskId,
		queue:     input.queue,
		status,
		message:   input.message,
		startedAt: existingEvent?.startedAt ?? now,
		updatedAt: now,
	};
}

export function publishHydratorTaskStarted(input: PublishHydratorProgressInput): void {
	const event = buildHydratorProgressEvent(
		input,
		"running",
	);
	activeHydratorTasks.set(
		input.taskId,
		event,
	);
	BUS_HydratorProgress.next(event);
}

export function publishHydratorTaskCompleted(input: PublishHydratorProgressInput): void {
	const event = buildHydratorProgressEvent(
		input,
		"completed",
	);
	activeHydratorTasks.delete(input.taskId);
	BUS_HydratorProgress.next(event);
}

export function publishHydratorTaskFailed(input: PublishHydratorProgressInput): void {
	const event = buildHydratorProgressEvent(
		input,
		"failed",
	);
	activeHydratorTasks.delete(input.taskId);
	BUS_HydratorProgress.next(event);
}

export function getHydratorProgressSnapshot(): HydratorProgressEvent[] {
	return Array
		.from(activeHydratorTasks.values())
		.sort((left, right) => left.startedAt - right.startedAt);
}
