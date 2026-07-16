// @vitest-environment node
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const logMainServiceError        = vi.fn();
const broadcastToRendererWindows = vi.fn();

let buses: {
	BUS_HydratorQueueChanges: Subject<void>;
	BUS_HydratorProgress: Subject<HydratorProgressEvent>;
};

function progressEvent(taskId: string, status: HydratorProgressEvent["status"]): HydratorProgressEvent {
	return {
		taskId,
		status,
		queue: "characters",
		message:   `${ taskId } ${ status }`,
		startedAt: 1,
		updatedAt: status === "running"
								 ? 1
								 : 2,
	};
}

describe(
	"initHydratorEventsBridge",
	() => {
		beforeEach(async () => {
			vi.useFakeTimers();
			vi.resetModules();
			vi.clearAllMocks();

			buses = {
				BUS_HydratorQueueChanges: new Subject<void>(),
				BUS_HydratorProgress:     new Subject<HydratorProgressEvent>(),
			};

			vi.doMock(
				"@nimlat/busses/main",
				() => buses,
			);
			vi.doMock(
				"@nimlat/loggers/main",
				() => ({
					LoggerUtils: {
						logMainServiceError,
					},
				}),
			);
			vi.doMock(
				"../utils/ipc-broadcast",
				() => ({
					broadcastToRendererWindows,
				}),
			);
			const { initHydratorEventsBridge } = await import("./hydrator-events-bridge");
			initHydratorEventsBridge();
		});

		afterEach(async () => {
			const { disposeHydratorEventsBridge } = await import("./hydrator-events-bridge");
			disposeHydratorEventsBridge();
			buses.BUS_HydratorQueueChanges.complete();
			buses.BUS_HydratorProgress.complete();
			vi.doUnmock("../utils/ipc-broadcast");
			vi.useRealTimers();
		});

		it(
			"coalesces renderer queue-change bursts into one notification",
			async () => {
				buses.BUS_HydratorQueueChanges.next();
				buses.BUS_HydratorQueueChanges.next();
				buses.BUS_HydratorQueueChanges.next();

				await vi.advanceTimersByTimeAsync(260);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(IpcChannels.MediaHydrationQueueChanged);
			},
		);

		it(
			"sends only the latest progress event for each task in a renderer batch",
			async () => {
				const firstTaskStarted   = progressEvent(
					"task-1",
					"running",
				);
				const firstTaskCompleted = progressEvent(
					"task-1",
					"completed",
				);
				const secondTaskStarted  = progressEvent(
					"task-2",
					"running",
				);

				buses.BUS_HydratorProgress.next(firstTaskStarted);
				buses.BUS_HydratorProgress.next(firstTaskCompleted);
				buses.BUS_HydratorProgress.next(secondTaskStarted);

				await vi.advanceTimersByTimeAsync(160);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(2);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					IpcChannels.HydratorProgress,
					firstTaskCompleted,
				);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					IpcChannels.HydratorProgress,
					secondTaskStarted,
				);
				expect(broadcastToRendererWindows).not.toHaveBeenCalledWith(
					IpcChannels.HydratorProgress,
					firstTaskStarted,
				);
			},
		);

		it(
			"does not attach duplicate bridge subscriptions",
			async () => {
				const { initHydratorEventsBridge } = await import("./hydrator-events-bridge");
				initHydratorEventsBridge();

				buses.BUS_HydratorQueueChanges.next();

				await vi.advanceTimersByTimeAsync(260);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(IpcChannels.MediaHydrationQueueChanged);
			},
		);
	},
);
