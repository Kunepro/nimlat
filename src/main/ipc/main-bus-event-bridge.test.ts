// @vitest-environment node
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subject } from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const broadcastToRendererWindows = vi.fn();
const logMainServiceError        = vi.fn();

vi.mock(
	"../utils/ipc-broadcast",
	() => ({
		broadcastToRendererWindows,
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError,
		},
	}),
);

describe(
	"main BUS event bridge",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"creates renderer channel notifiers with payloads",
			async () => {
				const { createRendererChannelNotifier } = await import("./main-bus-event-bridge");
				const event                             = { id: 101 };

				createRendererChannelNotifier(IpcChannels.ReleaseWatchPastListChanged)(
					event);

				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					IpcChannels.ReleaseWatchPastListChanged,
					event,
				);
			},
		);

		it(
			"creates renderer signal notifiers without adding an undefined payload",
			async () => {
				const { createRendererSignalNotifier } = await import("./main-bus-event-bridge");

				createRendererSignalNotifier(IpcChannels.MediaHydrationQueueChanged)();

				expect(broadcastToRendererWindows).toHaveBeenCalledWith(IpcChannels.MediaHydrationQueueChanged);
			},
		);

		it(
			"logs BUS subscription errors with the bridge context",
			async () => {
				const { subscribeMainBusEventBridge } = await import("./main-bus-event-bridge");
				const source$                         = new Subject<{ id: number }>();
				const notify                          = vi.fn();
				const error                           = new Error("bridge failed");

				const subscription = subscribeMainBusEventBridge({
					source$,
					notify,
					errorContext: "test.bridge",
				});

				source$.next({ id: 1 });
				source$.error(error);
				subscription.unsubscribe();

				expect(notify).toHaveBeenCalledWith({ id: 1 });
				expect(logMainServiceError).toHaveBeenCalledWith(
					"test.bridge",
					error,
				);
			},
		);

		it(
			"normalizes non-Error BUS subscription failures before logging",
			async () => {
				const { subscribeMainBusEventBridge } = await import("./main-bus-event-bridge");
				const source$                         = new Subject<{ id: number }>();

				const subscription = subscribeMainBusEventBridge({
					source$,
					notify:       vi.fn(),
					errorContext: "test.bridge",
				});

				source$.error("bridge string failure");
				subscription.unsubscribe();

				expect(logMainServiceError).toHaveBeenCalledWith(
					"test.bridge",
					expect.any(Error),
				);
				expect(logMainServiceError).toHaveBeenCalledWith(
					"test.bridge",
					expect.objectContaining({ message: "bridge string failure" }),
				);
			},
		);
	},
);
