// @vitest-environment node
import { of } from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { AnimeDbDownloadRunEvent } from "./anime-db-download-runner";

const mocks = vi.hoisted(() => ({
	animeDbDownloadProgressNext:          vi.fn(),
	getAnimeDbVersion:                    vi.fn<() => string | null | undefined>(),
	getAnimeDbDownloadTempPath:           vi.fn(() => "C:\\fake\\data\\anime_data.db.download"),
	getFailedInstalledReconcileVersion:   vi.fn<() => string | null>(),
	logMainServiceError:                  vi.fn(),
	needsReconcile:                       vi.fn<(version: string) => boolean>(),
	reconcileIfNeeded:                    vi.fn<(version: string) => unknown>(),
	resolveLatestRelease:                 vi.fn(),
	cleanupReplacementBackup:             vi.fn<() => Promise<void>>(),
	rollbackReplacementAfterFailedCommit: vi.fn<() => Promise<void>>(),
	setAnimeDbVersion:                    vi.fn<(version: string) => void>(),
	streamReplacement:                    vi.fn(),
}));

const REPLACEMENT_COMMIT = {
	backupCreated:            true,
	backupPath:               "C:\\fake\\data\\anime_data.db.backup",
	wasAttachedBeforeReplace: true,
};

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_AnimeDbDownloadProgress: {
			next: mocks.animeDbDownloadProgressNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			config: {
				getAnimeDbVersion: mocks.getAnimeDbVersion,
				setAnimeDbVersion: mocks.setAnimeDbVersion,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: mocks.logMainServiceError,
		},
	}),
);

vi.mock(
	"node:fs",
	() => ({
		default: {
			promises: {
				rm: vi.fn(),
			},
		},
	}),
);

vi.mock(
	"./anime-db-download-runner",
	() => ({
		getAnimeDbDownloadTempPath:       mocks.getAnimeDbDownloadTempPath,
		streamAnimeDbDownloadReplacement: mocks.streamReplacement,
	}),
);

vi.mock(
	"./anime-db-file-replacement",
	() => ({
		cleanupAnimeDbReplacementBackupAfterCommit:  mocks.cleanupReplacementBackup,
		rollbackAnimeDbReplacementAfterFailedCommit: mocks.rollbackReplacementAfterFailedCommit,
	}),
);

vi.mock(
	"./anime-db-post-install-reconcile",
	() => ({
		getFailedInstalledAnimeDbUserGroupingReconcileVersion: mocks.getFailedInstalledReconcileVersion,
		needsAnimeDbUserGroupingReconcile:                     mocks.needsReconcile,
		reconcileUserGroupingAfterAnimeDbInstallIfNeeded:      mocks.reconcileIfNeeded,
	}),
);

vi.mock(
	"./anime-db-release-resolution",
	() => ({
		getValidatedAnimeDbReleaseSourceConfig: () => ({
			owner: "owner",
			repo:  "repo",
		}),
		resolveLatestAnimeDbRelease:            mocks.resolveLatestRelease,
	}),
);

function mockLatestRelease(version = "v2"): void {
	mocks.resolveLatestRelease.mockResolvedValue({
		revisionTag:    version,
		dbAsset:        {
			downloadUrl: "https://example.test/anime_data.db",
		},
		checksumSha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	});
}

function mockSuccessfulReplacement(): void {
	const replacingEvent: AnimeDbDownloadRunEvent = {
		action: "statusChanged",
		status: "replacing",
	};
	const committedEvent: AnimeDbDownloadRunEvent = {
		action: "replacementCommitted",
		commit: REPLACEMENT_COMMIT,
	};
	mocks.streamReplacement.mockReturnValue(of(
		replacingEvent,
		committedEvent,
	));
}

function progressStatuses(): string[] {
	return mocks.animeDbDownloadProgressNext.mock.calls.map(([ progress ]) => progress.status as string);
}

describe(
	"anime-db-download-service post-install reconcile",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			mocks.getAnimeDbVersion.mockReturnValue("v1");
			mocks.getFailedInstalledReconcileVersion.mockReturnValue(null);
			mocks.needsReconcile.mockReturnValue(false);
			mockLatestRelease();
			mockSuccessfulReplacement();
		});

		it(
			"reconciles outdated user grouping after the new AnimeDB is attached and stamped",
			async () => {
				mocks.needsReconcile.mockReturnValue(true);
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");

				await expect(getAnimeDbDownloader().start()).resolves.toEqual({ success: true });

				expect(mocks.setAnimeDbVersion).toHaveBeenCalledWith("v2");
				expect(mocks.setAnimeDbVersion.mock.invocationCallOrder[ 0 ]).toBeLessThan(
					mocks.cleanupReplacementBackup.mock.invocationCallOrder[ 0 ],
				);
				expect(mocks.cleanupReplacementBackup.mock.invocationCallOrder[ 0 ]).toBeLessThan(
					mocks.reconcileIfNeeded.mock.invocationCallOrder[ 0 ],
				);
				expect(mocks.cleanupReplacementBackup).toHaveBeenCalledWith(REPLACEMENT_COMMIT);
				expect(mocks.reconcileIfNeeded).toHaveBeenCalledWith("v2");
				expect(progressStatuses()).toEqual(expect.arrayContaining([
					"downloading",
					"replacing",
					"reconciling",
					"completed",
				]));
			},
		);

		it(
			"skips reconcile when the installed grouping is already current or not user-owned",
			async () => {
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");

				await expect(getAnimeDbDownloader().start()).resolves.toEqual({ success: true });

				expect(mocks.setAnimeDbVersion).toHaveBeenCalledWith("v2");
				expect(mocks.cleanupReplacementBackup).toHaveBeenCalledWith(REPLACEMENT_COMMIT);
				expect(mocks.reconcileIfNeeded).not.toHaveBeenCalled();
				expect(progressStatuses()).not.toContain("reconciling");
			},
		);

		it(
			"retries a pending reconcile for an already-installed release without downloading or replacing it again",
			async () => {
				mocks.getAnimeDbVersion.mockReturnValue("v2");
				mocks.needsReconcile.mockReturnValue(true);
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");

				await expect(getAnimeDbDownloader().start()).resolves.toEqual({ success: true });

				expect(mocks.streamReplacement).not.toHaveBeenCalled();
				expect(mocks.setAnimeDbVersion).not.toHaveBeenCalled();
				expect(mocks.cleanupReplacementBackup).not.toHaveBeenCalled();
				expect(mocks.reconcileIfNeeded).toHaveBeenCalledWith("v2");
				expect(progressStatuses()).toEqual(expect.arrayContaining([
					"reconciling",
					"completed",
				]));
				expect(progressStatuses()).not.toContain("downloading");
				expect(progressStatuses()).not.toContain("replacing");
			},
		);

		it(
			"still rejects replacing an already-installed release when no reconcile is pending",
			async () => {
				mocks.getAnimeDbVersion.mockReturnValue("v2");
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");

				await expect(getAnimeDbDownloader().start()).resolves.toEqual({
					success: false,
					error:   "AnimeDB v2 is already installed",
				});
				expect(mocks.streamReplacement).not.toHaveBeenCalled();
				expect(mocks.reconcileIfNeeded).not.toHaveBeenCalled();
				expect(mocks.cleanupReplacementBackup).not.toHaveBeenCalled();
			},
		);

		it(
			"keeps the installed release and exposes a retry-only state when reconcile fails",
			async () => {
				let installedVersion = "v1";
				mocks.getAnimeDbVersion.mockImplementation(() => installedVersion);
				mocks.setAnimeDbVersion.mockImplementation((version) => {
					installedVersion = version;
				});
				mocks.needsReconcile.mockReturnValue(true);
				mocks.reconcileIfNeeded
					.mockImplementationOnce(() => {
						throw new Error("reconcile transaction failed");
					})
					.mockReturnValueOnce({ runId: 2 });
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");
				const downloader               = getAnimeDbDownloader();

				await expect(downloader.start()).resolves.toEqual({
					success: false,
					error:   "reconcile transaction failed",
				});
				expect(downloader.getProgress()).toMatchObject({
					status:       "reconcile_error",
					errorMessage: "reconcile transaction failed",
					version:      "v2",
				});
				expect(installedVersion).toBe("v2");

				mocks.getFailedInstalledReconcileVersion.mockReturnValue("v2");
				mocks.resolveLatestRelease.mockRejectedValue(new Error("network unavailable"));
				await expect(downloader.start()).resolves.toEqual({ success: true });
				expect(mocks.streamReplacement).toHaveBeenCalledTimes(1);
				expect(mocks.resolveLatestRelease).toHaveBeenCalledTimes(1);
				expect(mocks.setAnimeDbVersion).toHaveBeenCalledTimes(1);
				expect(mocks.cleanupReplacementBackup).toHaveBeenCalledTimes(1);
				expect(mocks.reconcileIfNeeded).toHaveBeenCalledTimes(2);
				expect(downloader.getProgress().status).toBe("completed");
			},
		);

		it(
			"does not start reconcile when the installed-version stamp fails after replacement",
			async () => {
				mocks.needsReconcile.mockReturnValue(true);
				mocks.setAnimeDbVersion.mockImplementation(() => {
					throw new Error("version stamp failed");
				});
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");

				await expect(getAnimeDbDownloader().start()).resolves.toEqual({
					success: false,
					error:   "version stamp failed",
				});
				expect(mocks.reconcileIfNeeded).not.toHaveBeenCalled();
				expect(mocks.rollbackReplacementAfterFailedCommit).toHaveBeenCalledWith(
					REPLACEMENT_COMMIT,
					expect.any(Error),
				);
				expect(mocks.cleanupReplacementBackup).not.toHaveBeenCalled();
				expect(progressStatuses()).not.toContain("reconciling");
			},
		);
	},
);
