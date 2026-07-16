// @vitest-environment node
import type {
	ExternalTrackingAccountsChangedEvent,
	ExternalTrackingExportProgressEvent,
} from "@nimlat/types/external-tracking";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let externalTrackingAccountsChangedBus: Subject<ExternalTrackingAccountsChangedEvent>;
let externalTrackingExportProgressBus: Subject<ExternalTrackingExportProgressEvent>;
const broadcastToRendererWindows = vi.fn();
const logMainServiceError        = vi.fn();

describe(
	"initExternalTrackingEventsBridge",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			externalTrackingAccountsChangedBus = new Subject<ExternalTrackingAccountsChangedEvent>();
			externalTrackingExportProgressBus = new Subject<ExternalTrackingExportProgressEvent>();

			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_ExternalTrackingAccountsChanged: externalTrackingAccountsChangedBus,
					BUS_ExternalTrackingExportProgress: externalTrackingExportProgressBus,
				}),
			);
			vi.doMock(
				"@nimlat/constants/ipc-channels",
				() => ({
					IpcChannels: {
						ExternalTrackingAccountsChanged: "external-tracking:accounts-changed",
						ExternalTrackingExportProgress: "external-tracking:export-progress",
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
		});

		afterEach(async () => {
			const { disposeExternalTrackingEventsBridge } = await import("./external-tracking-events-bridge");
			disposeExternalTrackingEventsBridge();
			externalTrackingAccountsChangedBus.complete();
			externalTrackingExportProgressBus.complete();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/constants/ipc-channels");
			vi.doUnmock("@nimlat/loggers/main");
			vi.doUnmock("../utils/ipc-broadcast");
		});

		it(
			"does not attach duplicate external-tracking subscriptions",
			async () => {
				const { initExternalTrackingEventsBridge } = await import("./external-tracking-events-bridge");
				initExternalTrackingEventsBridge();
				initExternalTrackingEventsBridge();

				const event = { provider: "mal" as const };
				externalTrackingAccountsChangedBus.next(event);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"external-tracking:accounts-changed",
					event,
				);
			},
		);

		it(
			"forwards explicit export progress",
			async () => {
				const { initExternalTrackingEventsBridge } = await import("./external-tracking-events-bridge");
				initExternalTrackingEventsBridge();
				const event: ExternalTrackingExportProgressEvent = {
					provider:       "kitsu",
					completedItems: 5,
					totalItems:     54,
					active:         true,
				};

				externalTrackingExportProgressBus.next(event);

				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"external-tracking:export-progress",
					event,
				);
			},
		);

		it(
			"stops forwarding after dispose",
			async () => {
				const {
								disposeExternalTrackingEventsBridge,
								initExternalTrackingEventsBridge,
							} = await import("./external-tracking-events-bridge");
				initExternalTrackingEventsBridge();
				disposeExternalTrackingEventsBridge();

				externalTrackingAccountsChangedBus.next({ provider: "anilist" });

				expect(broadcastToRendererWindows).not.toHaveBeenCalled();
			},
		);
	},
);
