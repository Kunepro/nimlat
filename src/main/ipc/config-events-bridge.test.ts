// @vitest-environment node
import type {
	BackgroundStyle,
	PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import { Subject } from "rxjs";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

let adultContentChangedBus: Subject<boolean>;
let backgroundStyleChangedBus: Subject<BackgroundStyle>;
let preferredTitleLanguageChangedBus: Subject<PreferredTitleLanguage>;
let canvasDiagnosticsChangedBus: Subject<boolean>;
const broadcastToRendererWindows = vi.fn();
const logMainServiceError        = vi.fn();

describe(
	"initConfigEventsBridge",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			adultContentChangedBus           = new Subject<boolean>();
			backgroundStyleChangedBus        = new Subject<BackgroundStyle>();
			preferredTitleLanguageChangedBus = new Subject<PreferredTitleLanguage>();
			canvasDiagnosticsChangedBus      = new Subject<boolean>();

			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_ConfigAdultContentChanged:           adultContentChangedBus,
					BUS_ConfigBackgroundStyleChanged:        backgroundStyleChangedBus,
					BUS_ConfigCanvasDiagnosticsChanged:      canvasDiagnosticsChangedBus,
					BUS_ConfigPreferredTitleLanguageChanged: preferredTitleLanguageChangedBus,
				}),
			);
			vi.doMock(
				"@nimlat/constants/ipc-channels",
				() => ({
					IpcChannels: {
						ConfigAdultContentChanged:           "config:adultContentChanged",
						ConfigBackgroundStyleChanged:        "config:backgroundStyleChanged",
						ConfigCanvasDiagnosticsChanged:      "config:canvasDiagnosticsChanged",
						ConfigPreferredTitleLanguageChanged: "config:preferredTitleLanguageChanged",
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
			const { disposeConfigEventsBridge } = await import("./config-events-bridge");
			disposeConfigEventsBridge();
			adultContentChangedBus.complete();
			backgroundStyleChangedBus.complete();
			preferredTitleLanguageChangedBus.complete();
			canvasDiagnosticsChangedBus.complete();
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/constants/ipc-channels");
			vi.doUnmock("@nimlat/loggers/main");
			vi.doUnmock("../utils/ipc-broadcast");
		});

		it(
			"does not attach duplicate config subscriptions",
			async () => {
				const { initConfigEventsBridge } = await import("./config-events-bridge");
				initConfigEventsBridge();
				initConfigEventsBridge();

				adultContentChangedBus.next(true);
				backgroundStyleChangedBus.next("kanaGrid");
				preferredTitleLanguageChangedBus.next("native");
				canvasDiagnosticsChangedBus.next(false);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(4);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"config:adultContentChanged",
					true,
				);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"config:backgroundStyleChanged",
					"kanaGrid",
				);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"config:preferredTitleLanguageChanged",
					"native",
				);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					"config:canvasDiagnosticsChanged",
					false,
				);
			},
		);

		it(
			"stops forwarding after dispose",
			async () => {
				const {
								disposeConfigEventsBridge,
								initConfigEventsBridge,
							} = await import("./config-events-bridge");
				initConfigEventsBridge();
				disposeConfigEventsBridge();

				adultContentChangedBus.next(true);

				expect(broadcastToRendererWindows).not.toHaveBeenCalled();
			},
		);
	},
);
