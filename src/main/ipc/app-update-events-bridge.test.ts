// @vitest-environment node
import type { AppUpdateStatus } from "@nimlat/types/app-update";
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

let appUpdateStatusChangedBus: Subject<AppUpdateStatus>;

describe(
	"initAppUpdateEventsBridge",
	() => {
		beforeEach(async () => {
			vi.resetModules();
			vi.clearAllMocks();
			appUpdateStatusChangedBus = new Subject<AppUpdateStatus>();

			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_AppUpdateStatusChanged: appUpdateStatusChangedBus,
				}),
			);
			vi.doMock(
				"@nimlat/constants/ipc-channels",
				() => ({
					IpcChannels: {
						AppUpdateStatusChanged: "app-update:status-changed",
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

			const { initAppUpdateEventsBridge } = await import("./app-update-events-bridge");
			initAppUpdateEventsBridge();
		});

		afterEach(async () => {
			const { disposeAppUpdateEventsBridge } = await import("./app-update-events-bridge");
			disposeAppUpdateEventsBridge();
			appUpdateStatusChangedBus.complete();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/constants/ipc-channels");
			vi.doUnmock("@nimlat/loggers/main");
			vi.doUnmock("../utils/ipc-broadcast");
		});

		it(
			"forwards app-update status changes to the renderer",
			() => {
				const status = {
					state:   "checking",
					version: {
						technicalVersion: "1.2.3",
						releaseNumber:    1,
						displayVersion:   "Version 1",
					},
				} satisfies AppUpdateStatus;

				appUpdateStatusChangedBus.next(status);

				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"app-update:status-changed",
					status,
				);
			},
		);
	},
);
