// @vitest-environment node

import { createAppVersionInfo } from "@nimlat/functions";
import type { AppUpdateStatus } from "@nimlat/types/app-update";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createAppUpdatePreferencesViewModel,
	createLocalAnimeDbReleaseStatus,
	createLocalErrorStatus,
	formatUnknownError,
	getLatestPublishedAppVersion,
	getStatusAlertType,
	getStatusMessage,
} from "./app-update-preferences-model";

const currentVersion = createAppVersionInfo("1.0.0");
const latestVersion  = createAppVersionInfo("1.1.0");

describe(
	"app-update-preferences-model",
	() => {
		it(
			"formats app update status copy",
			() => {
				const status: AppUpdateStatus = {
					state:   "available",
					version: currentVersion,
					latestVersion,
				};

				expect(getStatusMessage(status)).toBe(`${ latestVersion.displayVersion } is available.`);
				expect(getStatusAlertType(status)).toBe("success");
				expect(getLatestPublishedAppVersion(status)).toBe(latestVersion.displayVersion);
			},
		);

		it(
			"uses current version as latest when no app update is available",
			() => {
				const status: AppUpdateStatus = {
					state:   "not-available",
					version: currentVersion,
				};

				expect(getStatusMessage(status)).toBe("You are already running the latest available version.");
				expect(getStatusAlertType(status)).toBe("info");
				expect(getLatestPublishedAppVersion(status)).toBe(currentVersion.displayVersion);
			},
		);

		it(
			"creates local fallback statuses for failed reads",
			() => {
				expect(createLocalErrorStatus("broken")).toMatchObject({
					state:   "error",
					message: "broken",
				});
				expect(createLocalAnimeDbReleaseStatus("release lookup failed")).toEqual({
					installedVersion: null,
					latestVersion:    null,
					updateAvailable:  false,
					errorMessage:     "release lookup failed",
				});
			},
		);

		it(
			"creates the preferences view model from app and AnimeDB release state",
			() => {
				const status: AppUpdateStatus = {
					state:   "downloaded",
					version: currentVersion,
					latestVersion,
				};

				expect(createAppUpdatePreferencesViewModel({
					animeDbReleaseStatus:          {
						installedVersion: "anime-db-v1",
						latestVersion:    "anime-db-v2",
						updateAvailable:  true,
					},
					isActionRunning:               false,
					isAnimeDbReleaseStatusLoading: false,
					status,
				})).toMatchObject({
					canDownloadAnimeDb:        true,
					canUpdateApp:              true,
					currentVersion:            currentVersion.displayVersion,
					installedAnimeDbVersion:   "anime-db-v1",
					isChecking:                false,
					isDownloading:             false,
					latestAnimeDbVersion:      "anime-db-v2",
					latestPublishedAppVersion: latestVersion.displayVersion,
					statusMessage:             `${ latestVersion.displayVersion } is ready to install.`,
					updateAppLabel:            "Restart to install",
				});
			},
		);

		it(
			"keeps loading and fallback copy centralized for missing statuses",
			() => {
				expect(createAppUpdatePreferencesViewModel({
					animeDbReleaseStatus:          null,
					isActionRunning:               true,
					isAnimeDbReleaseStatusLoading: true,
					status:                        null,
				})).toMatchObject({
					canDownloadAnimeDb:        false,
					canUpdateApp:              false,
					currentVersion:            "Version 0",
					installedAnimeDbVersion:   "Not installed",
					isChecking:                true,
					latestAnimeDbVersion:      "Unable to check",
					latestPublishedAppVersion: "Check to verify",
					statusMessage:             "Loading app update status.",
					updateAppLabel:            "Update app",
				});
			},
		);

		it(
			"formats unknown errors with a stable fallback",
			() => {
				expect(formatUnknownError(
					new Error("boom"),
					"fallback",
				)).toBe("boom");
				expect(formatUnknownError(
					"boom",
					"fallback",
				)).toBe("fallback");
			},
		);

	},
);
