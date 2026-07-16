// @vitest-environment node
import { EventEmitter } from "node:events";
import type { Mock } from "vitest";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

interface MockAutoUpdater extends EventEmitter {
	autoDownload: boolean;
	autoInstallOnAppQuit: boolean;
	checkForUpdates: Mock<() => Promise<unknown>>;
	downloadUpdate: Mock<() => Promise<unknown>>;
	quitAndInstall: Mock<() => void>;
}

const appVersion              = "1.2.3";
const busNextMock             = vi.fn();
const logMainServiceErrorMock = vi.fn();
let appIsPackaged             = false;
let autoUpdaterMock: MockAutoUpdater;

function createMockAutoUpdater(): MockAutoUpdater {
	return Object.assign(
		new EventEmitter(),
		{
			autoDownload:         true,
			autoInstallOnAppQuit: true,
			checkForUpdates:      vi.fn<() => Promise<unknown>>(),
			downloadUpdate:       vi.fn<() => Promise<unknown>>(),
			quitAndInstall:       vi.fn<() => void>(),
		},
	);
}

describe(
	"AppUpdateService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			appIsPackaged   = false;
			autoUpdaterMock = createMockAutoUpdater();

			vi.doMock(
				"electron",
				() => ({
					app: {
						get isPackaged() {
							return appIsPackaged;
						},
						getVersion: () => appVersion,
					},
				}),
			);
			vi.doMock(
				"electron-updater",
				() => ({
					autoUpdater: autoUpdaterMock,
				}),
			);
			vi.doMock(
				"@nimlat/busses/main",
				() => ({
					BUS_AppUpdateStatusChanged: {
						next: busNextMock,
					},
				}),
			);
			vi.doMock(
				"@nimlat/loggers/main",
				() => ({
					LoggerUtils: {
						logMainServiceError: logMainServiceErrorMock,
					},
				}),
			);
		});

		afterEach(() => {
			vi.doUnmock("electron");
			vi.doUnmock("electron-updater");
			vi.doUnmock("@nimlat/busses/main");
			vi.doUnmock("@nimlat/loggers/main");
		});

		it(
			"reports app updates as unsupported outside packaged builds",
			async () => {
				const { AppUpdateService } = await import("./app-update-service");

				expect(AppUpdateService.getStatus()).toMatchObject({
					state:   "not-supported",
					version: {
						technicalVersion: appVersion,
					},
				});
				await expect(AppUpdateService.checkForUpdates()).resolves.toMatchObject({
					state: "not-supported",
				});
				expect(autoUpdaterMock.checkForUpdates).not.toHaveBeenCalled();
			},
		);

		it(
			"checks for updates without auto-downloading the release asset",
			async () => {
				appIsPackaged = true;
				autoUpdaterMock.checkForUpdates.mockImplementation(async () => {
					autoUpdaterMock.emit("checking-for-update");
					autoUpdaterMock.emit(
						"update-available",
						{ version: "2.0.0" },
					);
				});
				const { AppUpdateService } = await import("./app-update-service");

				AppUpdateService.init();
				const status = await AppUpdateService.checkForUpdates();

				expect(autoUpdaterMock.autoDownload).toBe(false);
				expect(autoUpdaterMock.autoInstallOnAppQuit).toBe(false);
				expect(status).toMatchObject({
					state:         "available",
					latestVersion: {
						technicalVersion: "2.0.0",
					},
				});
				expect(autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
				expect(busNextMock).toHaveBeenCalledWith(expect.objectContaining({
					state: "checking",
				}));
				expect(busNextMock).toHaveBeenCalledWith(expect.objectContaining({
					state: "available",
				}));
			},
		);

		it(
			"downloads and installs only after an explicit available update",
			async () => {
				appIsPackaged = true;
				autoUpdaterMock.checkForUpdates.mockImplementation(async () => {
					autoUpdaterMock.emit(
						"update-available",
						{ version: "2.0.0" },
					);
				});
				autoUpdaterMock.downloadUpdate.mockImplementation(async () => {
					autoUpdaterMock.emit(
						"download-progress",
						{
							percent:     50,
							transferred: 50,
							total:       100,
						},
					);
					autoUpdaterMock.emit(
						"update-downloaded",
						{ version: "2.0.0" },
					);
				});
				const { AppUpdateService } = await import("./app-update-service");

				AppUpdateService.init();
				await AppUpdateService.checkForUpdates();
				await expect(AppUpdateService.downloadUpdate()).resolves.toMatchObject({
					state:         "downloaded",
					latestVersion: {
						technicalVersion: "2.0.0",
					},
				});
				AppUpdateService.installDownloadedUpdate();

				expect(autoUpdaterMock.downloadUpdate).toHaveBeenCalledTimes(1);
				expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledTimes(1);
				expect(busNextMock).toHaveBeenCalledWith(expect.objectContaining({
					state:   "downloading",
					percent: 50,
				}));
				expect(busNextMock).toHaveBeenCalledWith(expect.objectContaining({
					state: "downloaded",
				}));
			},
		);
	},
);
