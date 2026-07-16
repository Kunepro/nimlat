import { BUS_AppUpdateStatusChanged } from "@nimlat/busses/main";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	AppUpdateStatus,
	AppVersionInfo,
} from "@nimlat/types/app-update";
import { app } from "electron";
import {
	autoUpdater,
	type ProgressInfo,
} from "electron-updater";
import {
	createAppUpdateVersionInfo,
	createAvailableAppUpdateStatus,
	createDownloadedAppUpdateStatus,
	createDownloadingAppUpdateStatus,
	createErrorAppUpdateStatus,
	createNotSupportedAppUpdateStatus,
	createSimpleAppUpdateStatus,
} from "./app-update-status-model";

function getCurrentVersionInfo(): AppVersionInfo {
	return createAppUpdateVersionInfo(app.getVersion());
}

function publishStatus(status: AppUpdateStatus): AppUpdateStatus {
	AppUpdateService.latestStatus = status;

	BUS_AppUpdateStatusChanged.next(status);

	return status;
}

export class AppUpdateService {
	static latestStatus: AppUpdateStatus = createSimpleAppUpdateStatus(
		"idle",
		getCurrentVersionInfo(),
	);

	private static isInitialized = false;
	private static isChecking    = false;
	private static isDownloading = false;
	private static latestAvailableVersion: AppVersionInfo | null = null;

	static init(): void {
		if (AppUpdateService.isInitialized) {
			return;
		}

		AppUpdateService.isInitialized = true;

		// The Preferences UI offers an explicit download action, so the updater
		// must not download in the background immediately after a check succeeds.
		autoUpdater.autoDownload = false;
		autoUpdater.autoInstallOnAppQuit = false;

		autoUpdater.on(
			"checking-for-update",
			() => {
				publishStatus(createSimpleAppUpdateStatus(
					"checking",
					getCurrentVersionInfo(),
				));
			},
		);

		autoUpdater.on(
			"update-available",
			(info) => {
				const status = createAvailableAppUpdateStatus(
					getCurrentVersionInfo(),
					info.version,
				);
				AppUpdateService.latestAvailableVersion = status.latestVersion;
				publishStatus(status);
			},
		);

		autoUpdater.on(
			"update-not-available",
			() => {
				AppUpdateService.latestAvailableVersion = null;
				publishStatus(createSimpleAppUpdateStatus(
					"not-available",
					getCurrentVersionInfo(),
				));
			},
		);

		autoUpdater.on(
			"download-progress",
			(progress) => {
				publishStatus(AppUpdateService.createDownloadingStatus(progress));
			},
		);

		autoUpdater.on(
			"update-downloaded",
			(info) => {
				AppUpdateService.isDownloading          = false;
				const status                            = createDownloadedAppUpdateStatus(
					getCurrentVersionInfo(),
					info.version,
				);
				AppUpdateService.latestAvailableVersion = status.latestVersion;
				publishStatus(status);
			},
		);

		autoUpdater.on(
			"error",
			(error) => {
				AppUpdateService.isChecking = false;
				AppUpdateService.isDownloading = false;
				AppUpdateService.publishError(error);
			},
		);
	}

	static getStatus(): AppUpdateStatus {
		if (!app.isPackaged) {
			return createNotSupportedAppUpdateStatus(getCurrentVersionInfo());
		}

		return AppUpdateService.latestStatus;
	}

	static async checkForUpdates(): Promise<AppUpdateStatus> {
		if (!app.isPackaged) {
			return publishStatus(createNotSupportedAppUpdateStatus(getCurrentVersionInfo()));
		}

		if (AppUpdateService.isChecking) {
			return AppUpdateService.latestStatus;
		}

		AppUpdateService.isChecking = true;

		try {
			await autoUpdater.checkForUpdates();
			return AppUpdateService.latestStatus;
		} catch (error: unknown) {
			return AppUpdateService.publishError(error);
		} finally {
			AppUpdateService.isChecking = false;
		}
	}

	static async downloadUpdate(): Promise<AppUpdateStatus> {
		if (!app.isPackaged) {
			return publishStatus(createNotSupportedAppUpdateStatus(getCurrentVersionInfo()));
		}

		if (AppUpdateService.isDownloading) {
			return AppUpdateService.latestStatus;
		}

		if (AppUpdateService.latestStatus.state !== "available") {
			return AppUpdateService.latestStatus;
		}

		AppUpdateService.isDownloading = true;

		try {
			await autoUpdater.downloadUpdate();
			return AppUpdateService.latestStatus;
		} catch (error: unknown) {
			return AppUpdateService.publishError(error);
		} finally {
			AppUpdateService.isDownloading = false;
		}
	}

	static installDownloadedUpdate(): void {
		if (AppUpdateService.latestStatus.state !== "downloaded") {
			return;
		}

		autoUpdater.quitAndInstall();
	}

	private static createDownloadingStatus(progress: ProgressInfo): AppUpdateStatus {
		return createDownloadingAppUpdateStatus(
			getCurrentVersionInfo(),
			progress,
			AppUpdateService.latestAvailableVersion,
		);
	}

	private static publishError(error: unknown): AppUpdateStatus {
		const typedError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"app-update",
			typedError,
		);

		return publishStatus(createErrorAppUpdateStatus(
			getCurrentVersionInfo(),
			typedError.message,
		));
	}
}
