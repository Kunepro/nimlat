import { createAppVersionInfo } from "@nimlat/functions";
import type {
	AppUpdateStatus,
	AppVersionInfo,
} from "@nimlat/types/app-update";

export interface AppUpdateDownloadProgressSnapshot {
	percent: number;
	total?: number;
	transferred?: number;
}

type AppUpdateSimpleStatusState = "idle" | "checking" | "not-available";
type AppUpdateAvailableStatus = Extract<AppUpdateStatus, { state: "available" }>;
type AppUpdateDownloadedStatus = Extract<AppUpdateStatus, { state: "downloaded" }>;
type AppUpdateDownloadingStatus = Extract<AppUpdateStatus, { state: "downloading" }>;

const APP_UPDATE_NOT_SUPPORTED_REASON = "Update checks are unavailable in this build.";

export function createAppUpdateVersionInfo(version: string): AppVersionInfo {
	return createAppVersionInfo(version);
}

// Status creation stays pure so the service can focus on Electron updater events,
// BUS publication, and error logging instead of duplicating UI-facing state shapes.
export function createSimpleAppUpdateStatus(
	state: AppUpdateSimpleStatusState,
	version: AppVersionInfo,
): AppUpdateStatus {
	return {
		state,
		version,
	};
}

export function createNotSupportedAppUpdateStatus(version: AppVersionInfo): AppUpdateStatus {
	return {
		state:  "not-supported",
		version,
		reason: APP_UPDATE_NOT_SUPPORTED_REASON,
	};
}

export function createAvailableAppUpdateStatus(
	version: AppVersionInfo,
	latestVersion: string,
): AppUpdateAvailableStatus {
	return {
		state:         "available",
		version,
		latestVersion: createAppUpdateVersionInfo(latestVersion),
	};
}

export function createDownloadingAppUpdateStatus(
	version: AppVersionInfo,
	progress: AppUpdateDownloadProgressSnapshot,
	latestVersion: AppVersionInfo | null,
): AppUpdateDownloadingStatus {
	return {
		state:            "downloading",
		version,
		latestVersion:    latestVersion ?? version,
		percent:          progress.percent,
		transferredBytes: progress.transferred,
		totalBytes:       progress.total,
	};
}

export function createDownloadedAppUpdateStatus(
	version: AppVersionInfo,
	latestVersion: string,
): AppUpdateDownloadedStatus {
	return {
		state:         "downloaded",
		version,
		latestVersion: createAppUpdateVersionInfo(latestVersion),
	};
}

export function createErrorAppUpdateStatus(
	version: AppVersionInfo,
	message: string,
): AppUpdateStatus {
	return {
		state: "error",
		version,
		message,
	};
}
