// @vitest-environment node
import type { ToasterMessageEvent } from "@nimlat/types/toaster";
import { ToasterType } from "@nimlat/types/toaster";
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

let toasterBus: Subject<ToasterMessageEvent>;

describe(
	"initToasterEventsBridge",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			toasterBus = new Subject<ToasterMessageEvent>();

			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_ToasterMessage: toasterBus,
				}),
			);
			vi.doMock(
				"@nimlat/constants/ipc-channels",
				() => ({
					IpcChannels: {
						ToasterMessage: "toaster:message",
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
			const { disposeToasterEventsBridge } = await import("./toaster-events-bridge");
			disposeToasterEventsBridge();
			toasterBus.complete();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/constants/ipc-channels");
			vi.doUnmock("@nimlat/loggers/main");
			vi.doUnmock("../utils/ipc-broadcast");
		});

		it(
			"forwards toaster messages to the renderer",
			async () => {
				const { initToasterEventsBridge } = await import("./toaster-events-bridge");
				initToasterEventsBridge();

				const event = {
					type:    ToasterType.INFO,
					message: "Queued",
				} satisfies ToasterMessageEvent;
				toasterBus.next(event);

				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"toaster:message",
					event,
				);
			},
		);

		it(
			"does not duplicate subscriptions and releases them on dispose",
			async () => {
				const {
								disposeToasterEventsBridge,
								initToasterEventsBridge,
							} = await import("./toaster-events-bridge");
				initToasterEventsBridge();
				initToasterEventsBridge();

				toasterBus.next({
					type:    ToasterType.SUCCESS,
					message: "Saved",
				});
				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);

				disposeToasterEventsBridge();
				toasterBus.next({
					type:    ToasterType.ERROR,
					message: "Hidden",
				});
				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);
			},
		);
	},
);
