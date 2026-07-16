// @vitest-environment node

import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	canShowAnimeDbSkipToApp,
	DEFAULT_ANIME_DB_DOWNLOAD_PROGRESS,
	formatAnimeDbDownloadActionError,
	getAnimeDbDownloadProgressPercent,
	getAnimeDbDownloadProgressStatus,
	getAnimeDbDownloadStartButtonLabel,
	getAnimeDbDownloadStatusLabel,
	getVisibleAnimeDbDownloadUiError,
	isAlreadyRunningAnimeDbDownloadError,
	isAnimeDbDownloadRunning,
	resolveDownloadAnimeDbIntroCopy,
	shouldAutoStartAnimeDbDownload,
} from "./download-precached-anime-db-model";

function createProgress(overrides: Partial<AnimeDbDownloadProgressData> = {}): AnimeDbDownloadProgressData {
	return {
		...DEFAULT_ANIME_DB_DOWNLOAD_PROGRESS,
		...overrides,
	};
}

describe(
	"download-precached-anime-db-model",
	() => {
		it(
			"derives progress percent and Ant progress status",
			() => {
				expect(getAnimeDbDownloadProgressPercent(createProgress({ percent: 0.424 }))).toBe(42);
				expect(getAnimeDbDownloadProgressPercent(createProgress({
					receivedBytes: 45,
					totalBytes:    90,
				}))).toBe(50);
				expect(getAnimeDbDownloadProgressPercent(createProgress({ percent: 2 }))).toBe(100);
				expect(getAnimeDbDownloadProgressStatus("completed")).toBe("success");
				expect(getAnimeDbDownloadProgressStatus("error")).toBe("exception");
				expect(getAnimeDbDownloadProgressStatus("reconcile_error")).toBe("exception");
				expect(getAnimeDbDownloadProgressStatus("downloading")).toBe("active");
			},
		);

		it(
			"keeps action visibility and labels stable across download phases",
			() => {
				expect(shouldAutoStartAnimeDbDownload("idle")).toBe(true);
				expect(shouldAutoStartAnimeDbDownload("canceled")).toBe(false);
				expect(isAnimeDbDownloadRunning("downloading")).toBe(true);
				expect(isAnimeDbDownloadRunning("reconciling")).toBe(true);
				expect(isAnimeDbDownloadRunning("completed")).toBe(false);
				expect(getAnimeDbDownloadStartButtonLabel("error")).toBe("Retry download");
				expect(getAnimeDbDownloadStartButtonLabel("reconcile_error")).toBe("Retry grouping update");
				expect(getAnimeDbDownloadStartButtonLabel("canceled")).toBe("Resume download");
				expect(getAnimeDbDownloadStartButtonLabel("idle")).toBe("Download catalogue data");
				expect(canShowAnimeDbSkipToApp(
					true,
					false,
					"canceled",
				)).toBe(true);
				expect(canShowAnimeDbSkipToApp(
					true,
					false,
					"idle",
				)).toBe(false);
			},
		);

		it(
			"formats visible status and suppresses duplicate action errors",
			() => {
				expect(getAnimeDbDownloadStatusLabel("verifying")).toBe("Downloading catalogue data");
				expect(getAnimeDbDownloadStatusLabel("reconciling")).toBe("Updating your groups");
				expect(getAnimeDbDownloadStatusLabel("reconcile_error")).toBe("Grouping update failed");
				expect(getVisibleAnimeDbDownloadUiError(
					"same",
					"same",
				)).toBeNull();
				expect(getVisibleAnimeDbDownloadUiError(
					"action failed",
					"download failed",
				)).toBe("action failed");
				expect(formatAnimeDbDownloadActionError(
					new Error("download exploded"),
					"fallback",
				)).toBe("download exploded");
				expect(formatAnimeDbDownloadActionError(
					"download exploded",
					"fallback",
				)).toBe("fallback");
			},
		);

		it(
			"recognizes benign auto-start collisions",
			() => {
				expect(isAlreadyRunningAnimeDbDownloadError("Anime database download is already running")).toBe(true);
				expect(isAlreadyRunningAnimeDbDownloadError("download failed")).toBe(false);
			},
		);

		it(
			"builds setup/update intro copy",
			() => {
				expect(resolveDownloadAnimeDbIntroCopy({
					canSkipToApp:       false,
					canUseLocalCatalog: false,
					isRunning:          true,
					status:             "downloading",
				})).toEqual({
					title:       "Initial setup",
					description: null,
				});
				expect(resolveDownloadAnimeDbIntroCopy({
					canSkipToApp:       true,
					canUseLocalCatalog: false,
					isRunning:          false,
					status:             "canceled",
				})).toEqual({
					title:       "Anime catalogue not found",
					description: "Resume the download or continue with an empty app.",
				});
				expect(resolveDownloadAnimeDbIntroCopy({
					canSkipToApp:       true,
					canUseLocalCatalog: true,
					isRunning:          false,
					status:             "idle",
				})).toEqual({
					title:       "Catalogue update",
					description: "Download the latest catalogue data.",
				});
			},
		);
	},
);
