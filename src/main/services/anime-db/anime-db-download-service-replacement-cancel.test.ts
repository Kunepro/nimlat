// @vitest-environment node

import {
	Observable,
	type Subscriber,
} from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { AnimeDbDownloadRunEvent } from "./anime-db-download-runner";

const mocks = vi.hoisted(() => ({
	animeDbDownloadProgressNext:      vi.fn(),
	getAnimeDbDownloadTempPath:       vi.fn(() => "C:\\fake\\data\\anime_data.db.download"),
	getAnimeDbVersion:        vi.fn(() => "v2026.07.01"),
	getValidatedReleaseSourceConfig:  vi.fn(() => ({
		owner:               "owner",
		repo:                "repo",
		dbAssetNameIncludes: "anime_data",
		dbAssetNameEndsWith: ".db",
	})),
	logMainServiceError:              vi.fn(),
	rm:                               vi.fn(),
	resolveLatestAnimeDbRelease:      vi.fn(),
	cleanupReplacementBackup: vi.fn(),
	rollbackReplacement:      vi.fn(),
	setAnimeDbVersion:                vi.fn(),
	streamAnimeDbDownloadReplacement: vi.fn(),
}));

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
	"./anime-db-post-install-reconcile",
	() => ({
		getFailedInstalledAnimeDbUserGroupingReconcileVersion: () => null,
		needsAnimeDbUserGroupingReconcile:                     () => false,
		reconcileUserGroupingAfterAnimeDbInstallIfNeeded:      vi.fn(),
	}),
);

vi.mock(
	"node:fs",
	() => ({
		default: {
			promises: {
				rm: mocks.rm,
			},
		},
	}),
);

vi.mock(
	"./anime-db-download-runner",
	() => ({
		getAnimeDbDownloadTempPath:       mocks.getAnimeDbDownloadTempPath,
		streamAnimeDbDownloadReplacement: mocks.streamAnimeDbDownloadReplacement,
	}),
);

// This unit exercises cancellation before a replacement commit exists. Mock the
// replacement boundary so importing the service does not initialize Electron paths.
vi.mock(
	"./anime-db-file-replacement",
	() => ({
		cleanupAnimeDbReplacementBackupAfterCommit:  mocks.cleanupReplacementBackup,
		rollbackAnimeDbReplacementAfterFailedCommit: mocks.rollbackReplacement,
	}),
);

vi.mock(
	"./anime-db-release-resolution",
	() => ({
		getValidatedAnimeDbReleaseSourceConfig: mocks.getValidatedReleaseSourceConfig,
		resolveLatestAnimeDbRelease:            mocks.resolveLatestAnimeDbRelease,
	}),
);

async function waitForAssertion(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		try {
			assertion();
			return;
		} catch {
			await Promise.resolve();
			await new Promise(resolve => setTimeout(
				resolve,
				0,
			));
		}
	}

	assertion();
}

describe(
	"anime-db-download-service replacement cancellation",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			mocks.rm.mockResolvedValue(undefined);
			mocks.resolveLatestAnimeDbRelease.mockResolvedValue({
				revisionTag:    "v2026.07.07",
				checksumSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
				dbAsset:        {
					downloadUrl: "https://example.test/anime_data.db",
				},
			});
		});

		it(
			"keeps replacement failures visible when cancel is requested after replacement starts",
			async () => {
				let runSubscriber: Subscriber<AnimeDbDownloadRunEvent> | undefined;
				mocks.streamAnimeDbDownloadReplacement.mockReturnValue(new Observable<AnimeDbDownloadRunEvent>((subscriber) => {
					runSubscriber = subscriber;
					subscriber.next({
						action: "statusChanged",
						status: "replacing",
					});
				}));

				const { getAnimeDbDownloader } = await import("./anime-db-download-service");
				const downloader               = getAnimeDbDownloader();
				const startPromise             = downloader.start();

				await waitForAssertion(() => {
					expect(runSubscriber).toBeDefined();
					expect(mocks.animeDbDownloadProgressNext).toHaveBeenCalledWith(expect.objectContaining({
						status: "replacing",
					}));
				});

				await expect(downloader.cancel()).resolves.toEqual({ success: true });
				expect(mocks.animeDbDownloadProgressNext).not.toHaveBeenCalledWith(expect.objectContaining({
					status: "canceled",
				}));

				runSubscriber?.error(new Error("replace failed"));

				await expect(startPromise).resolves.toEqual({
					success: false,
					error:   "replace failed",
				});
				expect(mocks.logMainServiceError).toHaveBeenCalledWith(
					"anime-db.download.run",
					expect.any(Error),
					{ tempPath: "C:\\fake\\data\\anime_data.db.download" },
				);
				expect(mocks.setAnimeDbVersion).not.toHaveBeenCalled();
				expect(mocks.animeDbDownloadProgressNext).toHaveBeenLastCalledWith(expect.objectContaining({
					status:       "error",
					errorMessage: "replace failed",
				}));
			},
		);
	},
);
