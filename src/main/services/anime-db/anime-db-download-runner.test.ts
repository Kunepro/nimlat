// @vitest-environment node
import {
	lastValueFrom,
	Observable,
	of,
	tap,
	toArray,
} from "rxjs";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	assertFileReconcileSafety:  vi.fn(),
	mkdir:                      vi.fn(),
	replaceAnimeDbFromDownload: vi.fn(),
	streamReleaseAssetDownload: vi.fn(),
	verifyDownloadedDbChecksum: vi.fn(),
}));

const REPLACEMENT_COMMIT = {
	backupCreated:            true,
	backupPath:               "C:\\fake\\data\\anime_data.db.backup",
	wasAttachedBeforeReplace: true,
};

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_DATA: "C:\\fake\\data",
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			metadata: {
				assertFileReconcileSafety: mocks.assertFileReconcileSafety,
			},
		},
	}),
);

vi.mock(
	"node:fs",
	() => ({
		default: {
			promises: {
				mkdir: mocks.mkdir,
			},
		},
	}),
);

vi.mock(
	"../../api/github-revisions-api",
	() => ({
		GitHubRevisionsAPI: {
			streamReleaseAssetDownload: mocks.streamReleaseAssetDownload,
		},
	}),
);

vi.mock(
	"./anime-db-download-checksum",
	() => ({
		verifyDownloadedDbChecksum: mocks.verifyDownloadedDbChecksum,
	}),
);

vi.mock(
	"./anime-db-file-replacement",
	() => ({
		replaceAnimeDbFromDownload: mocks.replaceAnimeDbFromDownload,
	}),
);

describe(
	"streamAnimeDbDownloadReplacement",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			mocks.replaceAnimeDbFromDownload.mockResolvedValue(REPLACEMENT_COMMIT);
		});

		it(
			"downloads, verifies, reconcile-checks, and replaces the DB while emitting typed progress events",
			async () => {
				const signal = new AbortController().signal;
				mocks.streamReleaseAssetDownload.mockReturnValue(of(
					{
						kind:     "progress",
						progress: {
							receivedBytes:       50,
							totalBytes:          100,
							percent:             0.5,
							speedBytesPerSecond: 25,
							etaSeconds:          2,
						},
					},
					{
						kind:   "completed",
						result: {
							destinationPath: "C:\\fake\\data\\anime_data.db.download",
							totalBytes:      100,
						},
					},
				));

				const {
								getAnimeDbDownloadTempPath,
								streamAnimeDbDownloadReplacement,
							} = await import("./anime-db-download-runner");

				const tempPath = getAnimeDbDownloadTempPath();
				const events   = await lastValueFrom(streamAnimeDbDownloadReplacement({
					url:            "https://example.com/anime_data.db",
					version:        "v2026.07.04",
					checksumSha256: "sha256",
					tempPath,
					signal,
				}).pipe(toArray()));

				expect(mocks.mkdir).toHaveBeenCalledWith(
					"C:\\fake\\data",
					{ recursive: true },
				);
				expect(mocks.streamReleaseAssetDownload).toHaveBeenCalledWith(expect.objectContaining({
					url:             "https://example.com/anime_data.db",
					destinationPath: tempPath,
					signal,
				}));
				expect(events).toEqual([
					{
						action:   "transferProgress",
						progress: {
							receivedBytes:       50,
							totalBytes:          100,
							percent:             0.5,
							speedBytesPerSecond: 25,
							etaSeconds:          2,
						},
					},
					{
						action: "statusChanged",
						status: "verifying",
					},
					{
						action: "statusChanged",
						status: "replacing",
					},
					{
						action: "replacementCommitted",
						commit: REPLACEMENT_COMMIT,
					},
				]);
				expect(mocks.verifyDownloadedDbChecksum).toHaveBeenCalledWith(
					tempPath,
					"sha256",
					"https://example.com/anime_data.db",
					"v2026.07.04",
					signal,
				);
				expect(mocks.assertFileReconcileSafety).toHaveBeenCalledWith(tempPath);
				expect(mocks.replaceAnimeDbFromDownload).toHaveBeenCalledWith(tempPath);
			},
		);

		it(
			"stops before verification when cancellation arrives after the transfer completes",
			async () => {
				const abortController        = new AbortController();
				const events: Array<unknown> = [];
				mocks.streamReleaseAssetDownload.mockReturnValue(new Observable((subscriber) => {
					subscriber.next({
						kind:   "completed",
						result: {
							destinationPath: "C:\\fake\\data\\anime_data.db.download",
							totalBytes:      100,
						},
					});
					subscriber.complete();
					abortController.abort();
				}));

				const {
								getAnimeDbDownloadTempPath,
								streamAnimeDbDownloadReplacement,
							} = await import("./anime-db-download-runner");

				await expect(lastValueFrom(streamAnimeDbDownloadReplacement({
					url:            "https://example.com/anime_data.db",
					version:        "v2026.07.04",
					checksumSha256: "sha256",
					tempPath:       getAnimeDbDownloadTempPath(),
					signal:         abortController.signal,
				}).pipe(tap(event => events.push(event))))).rejects.toMatchObject({
					name:    "AbortError",
					message: "AnimeDB download canceled during checksum verification.",
				});

				expect(events).not.toContainEqual({
					action: "statusChanged",
					status: "verifying",
				});
				expect(mocks.verifyDownloadedDbChecksum).not.toHaveBeenCalled();
				expect(mocks.assertFileReconcileSafety).not.toHaveBeenCalled();
				expect(mocks.replaceAnimeDbFromDownload).not.toHaveBeenCalled();
			},
		);

		it(
			"stops before reconcile and replacement when cancellation arrives during checksum verification",
			async () => {
				const abortController        = new AbortController();
				const events: Array<unknown> = [];
				mocks.streamReleaseAssetDownload.mockReturnValue(of({
					kind:   "completed",
					result: {
						destinationPath: "C:\\fake\\data\\anime_data.db.download",
						totalBytes:      100,
					},
				}));
				mocks.verifyDownloadedDbChecksum.mockImplementation(async () => {
					abortController.abort();
				});

				const {
								getAnimeDbDownloadTempPath,
								streamAnimeDbDownloadReplacement,
							}        = await import("./anime-db-download-runner");
				const tempPath = getAnimeDbDownloadTempPath();

				await expect(lastValueFrom(streamAnimeDbDownloadReplacement({
					url:            "https://example.com/anime_data.db",
					version:        "v2026.07.04",
					checksumSha256: "sha256",
					tempPath,
					signal:         abortController.signal,
				}).pipe(tap(event => events.push(event))))).rejects.toMatchObject({
					name:    "AbortError",
					message: "AnimeDB download canceled during reconcile safety check.",
				});

				expect(events).toContainEqual({
					action: "statusChanged",
					status: "verifying",
				});
				expect(mocks.verifyDownloadedDbChecksum).toHaveBeenCalledWith(
					tempPath,
					"sha256",
					"https://example.com/anime_data.db",
					"v2026.07.04",
					abortController.signal,
				);
				expect(mocks.assertFileReconcileSafety).not.toHaveBeenCalled();
				expect(mocks.replaceAnimeDbFromDownload).not.toHaveBeenCalled();
			},
		);
	},
);
