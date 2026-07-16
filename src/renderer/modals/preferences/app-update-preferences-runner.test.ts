// @vitest-environment jsdom

import { createAppVersionInfo } from "@nimlat/functions";
import type { AppUpdateStatus } from "@nimlat/types/app-update";
import type { AnimeDbDownloadReleaseStatus } from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	AnimeDbDownloadFacade,
	AppUpdateFacade,
} from "../../facades";
import {
	checkForAppUpdates,
	loadAnimeDbReleaseStatus,
	loadAppUpdateStatus,
	runAppUpdateForStatus,
	subscribeToAppUpdateStatusChanges,
} from "./app-update-preferences-runner";

function createIdleStatus(): AppUpdateStatus {
	return {
		state:   "idle",
		version: createAppVersionInfo("1.0.0"),
	};
}

function createAvailableStatus(): AppUpdateStatus {
	return {
		state:         "available",
		version:       createAppVersionInfo("1.0.0"),
		latestVersion: createAppVersionInfo("2.0.0"),
	};
}

function createDownloadedStatus(): AppUpdateStatus {
	return {
		state:         "downloaded",
		version:       createAppVersionInfo("1.0.0"),
		latestVersion: createAppVersionInfo("2.0.0"),
	};
}

const releaseStatus: AnimeDbDownloadReleaseStatus = {
	installedVersion: "anime-db-v1",
	latestVersion:    "anime-db-v2",
	updateAvailable:  true,
};

describe(
	"app-update-preferences-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads app and AnimeDB release status through facades",
			async () => {
				const status = createIdleStatus();
				vi.spyOn(
					AppUpdateFacade,
					"getStatus",
				).mockResolvedValue(status);
				vi.spyOn(
					AnimeDbDownloadFacade,
					"getReleaseStatus",
				).mockResolvedValue(releaseStatus);

				await expect(loadAppUpdateStatus()).resolves.toBe(status);
				await expect(loadAnimeDbReleaseStatus()).resolves.toBe(releaseStatus);

				expect(AppUpdateFacade.getStatus).toHaveBeenCalledTimes(1);
				expect(AnimeDbDownloadFacade.getReleaseStatus).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"subscribes to app update status events through the facade stream",
			() => {
				const status$  = new Subject<AppUpdateStatus>();
				const listener = vi.fn();
				vi.spyOn(
					AppUpdateFacade,
					"statusChanges",
				).mockReturnValue(status$);

				const subscription = subscribeToAppUpdateStatusChanges(listener);
				const status       = createAvailableStatus();

				status$.next(status);
				expect(listener).toHaveBeenCalledWith(status);
				expect(AppUpdateFacade.statusChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);

		it(
			"runs check, download, and install commands through the app update facade",
			async () => {
				const checkedStatus = createAvailableStatus();
				vi.spyOn(
					AppUpdateFacade,
					"checkForUpdates",
				).mockResolvedValue(checkedStatus);
				vi.spyOn(
					AppUpdateFacade,
					"downloadUpdate",
				).mockResolvedValue(checkedStatus);
				vi.spyOn(
					AppUpdateFacade,
					"installDownloadedUpdate",
				).mockResolvedValue();

				await expect(checkForAppUpdates()).resolves.toBe(checkedStatus);
				await expect(runAppUpdateForStatus(createIdleStatus())).resolves.toBe(checkedStatus);
				await expect(runAppUpdateForStatus(createDownloadedStatus())).resolves.toBeUndefined();

				expect(AppUpdateFacade.checkForUpdates).toHaveBeenCalledTimes(1);
				expect(AppUpdateFacade.downloadUpdate).toHaveBeenCalledTimes(1);
				expect(AppUpdateFacade.installDownloadedUpdate).toHaveBeenCalledTimes(1);
			},
		);
	},
);
