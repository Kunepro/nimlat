// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createAppUpdateVersionInfo,
	createAvailableAppUpdateStatus,
	createDownloadedAppUpdateStatus,
	createDownloadingAppUpdateStatus,
	createErrorAppUpdateStatus,
	createNotSupportedAppUpdateStatus,
	createSimpleAppUpdateStatus,
} from "./app-update-status-model";

describe(
	"app update status model",
	() => {
		it(
			"builds stable simple and unsupported states from the current app version",
			() => {
				const version = createAppUpdateVersionInfo("1.2.3");

				expect(createSimpleAppUpdateStatus(
					"idle",
					version,
				)).toEqual({
					state: "idle",
					version,
				});
				expect(createNotSupportedAppUpdateStatus(version)).toEqual({
					state:  "not-supported",
					version,
					reason: "Update checks are unavailable in this build.",
				});
			},
		);

		it(
			"normalizes available and downloaded release versions through AppVersionInfo",
			() => {
				const version = createAppUpdateVersionInfo("1.2.3");

				expect(createAvailableAppUpdateStatus(
					version,
					"2.0.0",
				)).toMatchObject({
					state:         "available",
					version,
					latestVersion: {
						technicalVersion: "2.0.0",
					},
				});
				expect(createDownloadedAppUpdateStatus(
					version,
					"2.0.0",
				)).toMatchObject({
					state:         "downloaded",
					version,
					latestVersion: {
						technicalVersion: "2.0.0",
					},
				});
			},
		);

		it(
			"keeps download progress bounded to the latest known update version",
			() => {
				const version       = createAppUpdateVersionInfo("1.2.3");
				const latestVersion = createAppUpdateVersionInfo("2.0.0");

				expect(createDownloadingAppUpdateStatus(
					version,
					{
						percent:     25,
						transferred: 50,
						total:       200,
					},
					latestVersion,
				)).toEqual({
					state:            "downloading",
					version,
					latestVersion,
					percent:          25,
					transferredBytes: 50,
					totalBytes:       200,
				});
				expect(createDownloadingAppUpdateStatus(
					version,
					{ percent: 10 },
					null,
				)).toMatchObject({
					state:         "downloading",
					latestVersion: version,
					percent:       10,
				});
			},
		);

		it(
			"keeps error status creation pure after the service has logged the error",
			() => {
				const version = createAppUpdateVersionInfo("1.2.3");

				expect(createErrorAppUpdateStatus(
					version,
					"download failed",
				)).toEqual({
					state:   "error",
					version,
					message: "download failed",
				});
			},
		);
	},
);
