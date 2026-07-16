// @vitest-environment node
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const broadcastToRendererWindows = vi.fn();
const logMainServiceError        = vi.fn();

let aniListQueuePausedBus: Subject<number>;

describe(
	"initAniListQueueEventsBridge",
	() => {
		beforeEach(async () => {
			vi.resetModules();
			vi.clearAllMocks();
			aniListQueuePausedBus = new Subject<number>();

			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_AniListQueuePaused: aniListQueuePausedBus,
				}),
			);
			vi.doMock(
				"@nimlat/constants/ipc-channels",
				() => ({
					IpcChannels: {
						AniListQueuePaused: "ani-list:queue-paused",
					},
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

			const { initAniListQueueEventsBridge } = await import("./ani-list-queue-events-bridge");
			initAniListQueueEventsBridge();
		});

		afterEach(async () => {
			const { disposeAniListQueueEventsBridge } = await import("./ani-list-queue-events-bridge");
			disposeAniListQueueEventsBridge();
			aniListQueuePausedBus.complete();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/constants/ipc-channels");
			vi.doUnmock("@nimlat/loggers/main");
			vi.doUnmock("../utils/ipc-broadcast");
		});

		it(
			"forwards AniList queue pauses to the renderer",
			() => {
				aniListQueuePausedBus.next(42);

				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"ani-list:queue-paused",
					42,
				);
			},
		);
	},
);
