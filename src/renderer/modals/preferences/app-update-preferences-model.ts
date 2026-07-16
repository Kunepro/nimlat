import { createAppVersionInfo } from "@nimlat/functions";
import type { AppUpdateStatus } from "@nimlat/types/app-update";
import type { AnimeDbDownloadReleaseStatus } from "@nimlat/types/ipc-payloads";

export type AppUpdateStatusAlertType = "info" | "success" | "warning" | "error";

export interface AppUpdatePreferencesViewModel {
	animeDbReleaseErrorMessage: string | null;
	animeDbReleaseStatusMessage: string;
	canDownloadAnimeDb: boolean;
	canUpdateApp: boolean;
	currentVersion: string;
	installedAnimeDbVersion: string;
	isActionRunning: boolean;
	isAnimeDbReleaseStatusLoading: boolean;
	isChecking: boolean;
	isDownloading: boolean;
	latestAnimeDbVersion: string;
	latestPublishedAppVersion: string;
	status: AppUpdateStatus | null;
	statusMessage: string;
	updateAppLabel: string;
}

interface CreateAppUpdatePreferencesViewModelInput {
	animeDbReleaseStatus: AnimeDbDownloadReleaseStatus | null;
	isActionRunning: boolean;
	isAnimeDbReleaseStatusLoading: boolean;
	status: AppUpdateStatus | null;
}

export function formatUnknownError(
	error: unknown,
	fallbackMessage: string,
): string {
	return error instanceof Error ? error.message : fallbackMessage;
}

export function createLocalErrorStatus(message: string): AppUpdateStatus {
	return {
		state:   "error",
		version: createAppVersionInfo("0.0.0"),
		message,
	};
}

export function getStatusMessage(status: AppUpdateStatus): string {
	switch (status.state) {
		case "idle":
			return "No update check has been run in this session.";
		case "not-supported":
			return "Install a released app build to use automatic updates.";
		case "checking":
			return "Checking for a newer app version.";
		case "available":
			return `${ status.latestVersion.displayVersion } is available.`;
		case "not-available":
			return "You are already running the latest available version.";
		case "downloading":
			return `Downloading ${ status.latestVersion.displayVersion }.`;
		case "downloaded":
			return `${ status.latestVersion.displayVersion } is ready to install.`;
		case "error":
			return status.message;
	}
}

export function getStatusAlertType(status: AppUpdateStatus): AppUpdateStatusAlertType {
	switch (status.state) {
		case "available":
		case "downloaded":
			return "success";
		case "not-supported":
			return "warning";
		case "error":
			return "error";
		default:
			return "info";
	}
}

export function getLatestPublishedAppVersion(status: AppUpdateStatus | null): string {
	if (!status) {
		return "Check to verify";
	}

	switch (status.state) {
		case "available":
		case "downloading":
		case "downloaded":
			return status.latestVersion.displayVersion;
		case "not-available":
			return status.version.displayVersion;
		default:
			return "Check to verify";
	}
}

export function createLocalAnimeDbReleaseStatus(errorMessage: string): AnimeDbDownloadReleaseStatus {
	return {
		installedVersion: null,
		latestVersion:    null,
		updateAvailable:  false,
		errorMessage,
	};
}

export function createAppUpdatePreferencesViewModel({
																											animeDbReleaseStatus,
																											isActionRunning,
																											isAnimeDbReleaseStatusLoading,
																											status,
																										}: CreateAppUpdatePreferencesViewModelInput): AppUpdatePreferencesViewModel {
	const installedAnimeDbVersion = animeDbReleaseStatus?.installedVersion ?? "Not installed";
	const latestAnimeDbVersion    = animeDbReleaseStatus?.latestVersion ?? "Unable to check";
	const isDownloading           = status?.state === "downloading";
	const canUpdateApp            = status?.state === "available" || status?.state === "downloaded";
	const updateAppLabel          = status?.state === "downloaded"
		? "Restart to install"
		: "Update app";

	// Keep view-only derivation in this pure model so the hook can stay an
	// orchestration shell around preload events and actions.
	return {
		animeDbReleaseErrorMessage: animeDbReleaseStatus?.errorMessage ?? null,
		animeDbReleaseStatusMessage: getAnimeDbReleaseStatusMessage(
			animeDbReleaseStatus,
			isAnimeDbReleaseStatusLoading,
		),
		canDownloadAnimeDb:         Boolean(animeDbReleaseStatus?.updateAvailable),
		canUpdateApp,
		currentVersion:             status?.version.displayVersion ?? "Version 0",
		installedAnimeDbVersion,
		isActionRunning,
		isAnimeDbReleaseStatusLoading,
		isChecking:                 status?.state === "checking" || isActionRunning,
		isDownloading,
		latestAnimeDbVersion,
		latestPublishedAppVersion:  getLatestPublishedAppVersion(status),
		status,
		statusMessage:              status ? getStatusMessage(status) : "Loading app update status.",
		updateAppLabel,
	};
}

function getAnimeDbReleaseStatusMessage(
	status: AnimeDbDownloadReleaseStatus | null,
	isLoading: boolean,
): string {
	if (isLoading) {
		return "Checking the latest published AnimeDB version.";
	}
	if (status?.errorMessage) {
		return "The latest AnimeDB version could not be verified.";
	}
	if (!status?.installedVersion) {
		return "AnimeDB is not installed.";
	}
	if (status.updateAvailable) {
		return `${ status.latestVersion ?? "A newer AnimeDB version" } is available.`;
	}

	return "You already have the latest AnimeDB version.";
}
