import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";

export type AnimeDbDownloadProgressStatus = "active" | "exception" | "success";

export interface DownloadAnimeDbIntroCopy {
	title: string;
	description: string | null;
}

interface DownloadAnimeDbIntroOptions {
	canSkipToApp: boolean;
	canUseLocalCatalog: boolean;
	isRunning: boolean;
	status: AnimeDbDownloadProgressData["status"];
}

export const DEFAULT_ANIME_DB_DOWNLOAD_PROGRESS: AnimeDbDownloadProgressData = {
	status:              "idle",
	receivedBytes:       0,
	totalBytes:          null,
	percent:             null,
	speedBytesPerSecond: null,
	etaSeconds:          null,
};

const AUTO_START_STATUSES = new Set<AnimeDbDownloadProgressData["status"]>([
	"idle",
	"error",
]);

const RUNNING_STATUSES = new Set<AnimeDbDownloadProgressData["status"]>([
	"downloading",
	"verifying",
	"replacing",
	"reconciling",
]);

const STATUS_LABELS: Record<AnimeDbDownloadProgressData["status"], string> = {
	idle:        "Ready to download",
	downloading: "Downloading catalogue data",
	verifying:   "Downloading catalogue data",
	replacing:   "Downloading catalogue data",
	reconciling:     "Updating your groups",
	completed:   "Ready",
	error:       "Download failed",
	reconcile_error: "Grouping update failed",
	canceled:    "Download stopped",
};

export function shouldAutoStartAnimeDbDownload(status: AnimeDbDownloadProgressData["status"]): boolean {
	return AUTO_START_STATUSES.has(status);
}

export function isAlreadyRunningAnimeDbDownloadError(error: string): boolean {
	return error === "Anime database download is already running";
}

export function formatAnimeDbDownloadActionError(
	error: unknown,
	fallbackMessage: string,
): string {
	return error instanceof Error ? error.message : fallbackMessage;
}

export function isAnimeDbDownloadRunning(status: AnimeDbDownloadProgressData["status"]): boolean {
	return RUNNING_STATUSES.has(status);
}

export function getAnimeDbDownloadProgressPercent(progress: AnimeDbDownloadProgressData): number {
	if (progress.percent !== null) {
		return Math.min(
			100,
			Math.max(
				0,
				Math.round(progress.percent * 100),
			),
		);
	}

	if (progress.totalBytes && progress.totalBytes > 0) {
		return Math.min(
			100,
			Math.max(
				0,
				Math.round((progress.receivedBytes / progress.totalBytes) * 100),
			),
		);
	}

	return 0;
}

export function getAnimeDbDownloadProgressStatus(
	status: AnimeDbDownloadProgressData["status"],
): AnimeDbDownloadProgressStatus {
	if (status === "error" || status === "reconcile_error") {
		return "exception";
	}

	return status === "completed" ? "success" : "active";
}

export function getVisibleAnimeDbDownloadUiError(
	uiError: string | null,
	progressError?: string,
): string | null {
	// Download failures can arrive both from the action result and from persisted progress.
	// Keep the UI-local copy only when it adds context instead of repeating the same message twice.
	return uiError && uiError !== progressError ? uiError : null;
}

export function getAnimeDbDownloadStartButtonLabel(status: AnimeDbDownloadProgressData["status"]): string {
	if (status === "error") {
		return "Retry download";
	}
	if (status === "reconcile_error") {
		return "Retry grouping update";
	}

	if (status === "canceled") {
		return "Resume download";
	}

	return "Download catalogue data";
}

export function canShowAnimeDbSkipToApp(
	canSkipToApp: boolean,
	canUseLocalCatalog: boolean,
	status: AnimeDbDownloadProgressData["status"],
): boolean {
	return canSkipToApp && (canUseLocalCatalog || status === "canceled");
}

export function getAnimeDbDownloadStatusLabel(status: AnimeDbDownloadProgressData["status"]): string {
	return STATUS_LABELS[ status ];
}

export function resolveDownloadAnimeDbIntroCopy({
																									canSkipToApp,
																									canUseLocalCatalog,
																									isRunning,
																									status,
																								}: DownloadAnimeDbIntroOptions): DownloadAnimeDbIntroCopy {
	if (isRunning) {
		return {
			title:       "Initial setup",
			description: null,
		};
	}

	if (canSkipToApp && !canUseLocalCatalog && status === "canceled") {
		return {
			title:       "Anime catalogue not found",
			description: "Resume the download or continue with an empty app.",
		};
	}

	if (!canUseLocalCatalog) {
		return {
			title:       "Initial setup",
			description: null,
		};
	}

	return {
		title:       "Catalogue update",
		description: "Download the latest catalogue data.",
	};
}
