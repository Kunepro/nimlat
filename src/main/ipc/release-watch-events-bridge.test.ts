// @vitest-environment node
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type { ReleaseWatchListChangedEvent } from "@nimlat/types/release-watch";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let releaseWatchPastListChangedBus: Subject<ReleaseWatchListChangedEvent>;
let releaseWatchUpcomingListChangedBus: Subject<ReleaseWatchListChangedEvent>;
const logMainServiceError        = vi.fn();
const broadcastToRendererWindows = vi.fn();

describe(
	"initReleaseWatchEventsBridge",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			releaseWatchPastListChangedBus     = new Subject<ReleaseWatchListChangedEvent>();
			releaseWatchUpcomingListChangedBus = new Subject<ReleaseWatchListChangedEvent>();

			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_ReleaseWatchPastListChanged:     releaseWatchPastListChangedBus,
					BUS_ReleaseWatchUpcomingListChanged: releaseWatchUpcomingListChangedBus,
				}),
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
		});

		afterEach(async () => {
			const { disposeReleaseWatchEventsBridge } = await import("./release-watch-events-bridge");
			disposeReleaseWatchEventsBridge();
			releaseWatchPastListChangedBus.complete();
			releaseWatchUpcomingListChangedBus.complete();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/loggers/main");
			vi.doUnmock("../utils/ipc-broadcast");
		});

		it(
			"does not attach duplicate release-watch subscriptions",
			async () => {
				const { initReleaseWatchEventsBridge } = await import("./release-watch-events-bridge");
				initReleaseWatchEventsBridge();
				initReleaseWatchEventsBridge();

				const pastEvent     = { affectedMediaIds: [ 201 ] };
				const upcomingEvent = { affectedMediaIds: [ 202 ] };
				releaseWatchPastListChangedBus.next(pastEvent);
				releaseWatchUpcomingListChangedBus.next(upcomingEvent);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(2);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					IpcChannels.ReleaseWatchPastListChanged,
					pastEvent,
				);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					IpcChannels.ReleaseWatchUpcomingListChanged,
					upcomingEvent,
				);
			},
		);

		it(
			"stops forwarding after dispose",
			async () => {
				const {
								disposeReleaseWatchEventsBridge,
								initReleaseWatchEventsBridge,
							} = await import("./release-watch-events-bridge");
				initReleaseWatchEventsBridge();
				disposeReleaseWatchEventsBridge();

				releaseWatchPastListChangedBus.next({ affectedMediaIds: [ 203 ] });
				releaseWatchUpcomingListChangedBus.next({ affectedMediaIds: [ 204 ] });

				expect(broadcastToRendererWindows).not.toHaveBeenCalled();
			},
		);
	},
);
