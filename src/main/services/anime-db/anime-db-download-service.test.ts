// @vitest-environment node
import type { ListAnimeDbRevisionsResult } from "@nimlat/types/github-revisions";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const {
				animeDataAttachedMock,
				attachAnimeDataMock,
				assertFileReconcileSafetyMock,
				animeDbDownloadProgressNextMock,
				detachAnimeDataIfAttachedMock,
				logMainServiceErrorMock,
				getAnimeDbVersionMock,
				setAnimeDbVersionMock,
			} = vi.hoisted(() => ({
	animeDataAttachedMock:           vi.fn(),
	attachAnimeDataMock:             vi.fn(),
	assertFileReconcileSafetyMock:   vi.fn(),
	animeDbDownloadProgressNextMock: vi.fn(),
	detachAnimeDataIfAttachedMock:   vi.fn(),
	getAnimeDbVersionMock:           vi.fn(),
	logMainServiceErrorMock:         vi.fn(),
	setAnimeDbVersionMock:           vi.fn(),
}));

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_AnimeDbDownloadProgress: {
			next: animeDbDownloadProgressNextMock,
		},
	}),
);

vi.mock(
	"@nimlat/constants/ipc-channels",
	() => ({
		IpcChannels: {
			AnimeDbDownloadProgress: "anime-db:progress",
		},
	}),
);

vi.mock(
	"@nimlat/constants/main/anime-db-release-source",
	() => ({
		ANIME_DB_RELEASE_SOURCE: {
			owner:               "owner",
			repo:                "repo",
			dbAssetNameIncludes: "anime_data",
			dbAssetNameEndsWith: ".db",
		},
	}),
);

vi.mock(
	"@nimlat/constants/main/system-folders",
	() => ({
		PATH_ANIME_DB: "C:\\fake\\anime_data.db",
		PATH_DATA:     "C:\\fake\\data",
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbAttachmentService: {
			isAnimeDataAttached:       animeDataAttachedMock,
			detachAnimeDataIfAttached: detachAnimeDataIfAttachedMock,
			attachAnimeData:           attachAnimeDataMock,
		},
		AnimeDbFacade: {
			metadata: {
				assertFileReconcileSafety: assertFileReconcileSafetyMock,
			},
		},
		UserDbFacade:             {
			config: {
				getAnimeDbVersion: getAnimeDbVersionMock,
				setAnimeDbVersion: setAnimeDbVersionMock,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: logMainServiceErrorMock,
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
	"electron",
	() => ({
		webContents: {
			getAllWebContents: () => [],
		},
	}),
);

vi.mock(
	"node:fs",
	() => ({
		default: {
			constants:        {
				F_OK: 0,
			},
			promises:         {
				access: vi.fn(),
				mkdir:  vi.fn(),
				rm:     vi.fn(),
				rename: vi.fn(),
			},
			createReadStream: vi.fn(),
		},
	}),
);

vi.mock(
	"../../api/github-revisions-api",
	() => ({
		GitHubRevisionsAPI: {
			listAnimeDbRevisions: vi.fn(),
			streamReleaseAssetDownload: vi.fn(),
		},
	}),
);

const VALID_SHA256 = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function createDownloadableReleaseResult(version: string): ListAnimeDbRevisionsResult {
	return {
		revisions:   [
			{
				id:           1,
				tagName:      version,
				name:         version,
				createdAt:    "2026-07-02T00:00:00Z",
				publishedAt:  "2026-07-02T00:00:00Z",
				isDraft:      false,
				isPrerelease: false,
				assets:       [
					{
						id:          10,
						name:        "anime_data.db",
						size:        100,
						contentType: "application/octet-stream",
						downloadUrl: "https://example.com/anime_data.db",
						createdAt:   "2026-07-02T00:00:00Z",
						updatedAt:   "2026-07-02T00:00:00Z",
						sha256:      VALID_SHA256,
					},
				],
			},
		],
		page:        1,
		perPage:     100,
		hasNextPage: false,
		nextPage:    null,
	};
}

describe(
	"anime-db-download-service",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"reports when a newer downloadable AnimeDB release is available",
			async () => {
				const { GitHubRevisionsAPI } = await import("../../api/github-revisions-api");
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");
				getAnimeDbVersionMock.mockReturnValue("v2026.01");
				vi.mocked(GitHubRevisionsAPI.listAnimeDbRevisions).mockResolvedValue({
					revisions: [
						{
							id:           1,
							tagName:      "v2026.02",
							name:         "v2026.02",
							createdAt:    "2026-02-01T00:00:00Z",
							publishedAt:  "2026-02-01T00:00:00Z",
							isDraft:      false,
							isPrerelease: false,
							assets:       [
								{
									id:          10,
									name:        "anime_data.db",
									size:        100,
									contentType: "application/octet-stream",
									downloadUrl: "https://example.com/anime_data.db",
									createdAt:   "2026-02-01T00:00:00Z",
									updatedAt:   "2026-02-01T00:00:00Z",
									sha256: VALID_SHA256,
								},
							],
						},
					],
					page:        1,
					perPage:     100,
					hasNextPage: false,
					nextPage:    null,
				});

				await expect(getAnimeDbDownloader().getReleaseStatus()).resolves.toEqual({
					installedVersion: "v2026.01",
					latestVersion:    "v2026.02",
					updateAvailable:  true,
				});
			},
		);

		it(
			"skips matching AnimeDB release assets that do not expose a valid checksum digest",
			async () => {
				const { GitHubRevisionsAPI }   = await import("../../api/github-revisions-api");
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");
				getAnimeDbVersionMock.mockReturnValue("v2026.01");
				vi.mocked(GitHubRevisionsAPI.listAnimeDbRevisions).mockResolvedValue({
					revisions: [
						{
							id:           1,
							tagName:      "v2026.03",
							name:         "v2026.03",
							createdAt:    "2026-03-01T00:00:00Z",
							publishedAt:  "2026-03-01T00:00:00Z",
							isDraft:      false,
							isPrerelease: false,
							assets:       [
								{
									id:          10,
									name:        "anime_data.db",
									size:        100,
									contentType: "application/octet-stream",
									downloadUrl: "https://example.com/anime_data.db",
									createdAt:   "2026-03-01T00:00:00Z",
									updatedAt:   "2026-03-01T00:00:00Z",
									sha256:      "sha256:not-valid",
								},
							],
						},
						{
							id:           2,
							tagName:      "v2026.02",
							name:         "v2026.02",
							createdAt:    "2026-02-01T00:00:00Z",
							publishedAt:  "2026-02-01T00:00:00Z",
							isDraft:      false,
							isPrerelease: false,
							assets:       [
								{
									id:          20,
									name:        "anime_data.db",
									size:        100,
									contentType: "application/octet-stream",
									downloadUrl: "https://example.com/anime_data.db",
									createdAt:   "2026-02-01T00:00:00Z",
									updatedAt:   "2026-02-01T00:00:00Z",
									sha256:      VALID_SHA256,
								},
							],
						},
					],
					page:        1,
					perPage:     100,
					hasNextPage: false,
					nextPage:    null,
				});

				await expect(getAnimeDbDownloader().getReleaseStatus()).resolves.toEqual({
					installedVersion: "v2026.01",
					latestVersion:    "v2026.02",
					updateAvailable:  true,
				});
			},
		);

		it(
			"does not advertise an AnimeDB update when no release asset has a valid checksum digest",
			async () => {
				const { GitHubRevisionsAPI } = await import("../../api/github-revisions-api");
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");
				getAnimeDbVersionMock.mockReturnValue("v2026.01");
				vi.mocked(GitHubRevisionsAPI.listAnimeDbRevisions).mockResolvedValue({
					revisions:   [
						{
							id:           1,
							tagName:      "v2026.03",
							name:         "v2026.03",
							createdAt:    "2026-03-01T00:00:00Z",
							publishedAt:  "2026-03-01T00:00:00Z",
							isDraft:      false,
							isPrerelease: false,
							assets:       [
								{
									id:          10,
									name:        "anime_data.db",
									size:        100,
									contentType: "application/octet-stream",
									downloadUrl: "https://example.com/anime_data.db",
									createdAt:   "2026-03-01T00:00:00Z",
									updatedAt:   "2026-03-01T00:00:00Z",
								},
							],
						},
					],
					page:        1,
					perPage:     100,
					hasNextPage: false,
					nextPage:    null,
				});

				await expect(getAnimeDbDownloader().getReleaseStatus()).resolves.toMatchObject({
					installedVersion: "v2026.01",
					latestVersion:    null,
					updateAvailable:  false,
				});
			},
		);

		it(
			"rejects replacing AnimeDB with the already installed release",
			async () => {
				const { GitHubRevisionsAPI }   = await import("../../api/github-revisions-api");
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");
				getAnimeDbVersionMock.mockReturnValue("anime-db-v2026.07.02");
				vi.mocked(GitHubRevisionsAPI.listAnimeDbRevisions).mockResolvedValue(
					createDownloadableReleaseResult("anime-db-v2026.07.02"),
				);

				await expect(getAnimeDbDownloader().start()).resolves.toEqual({
					success: false,
					error:   "AnimeDB anime-db-v2026.07.02 is already installed",
				});
				expect(GitHubRevisionsAPI.streamReleaseAssetDownload).not.toHaveBeenCalled();
				expect(setAnimeDbVersionMock).not.toHaveBeenCalled();
			},
		);

		it(
			"honors cancellation while the latest GitHub release is still resolving",
			async () => {
				const { GitHubRevisionsAPI } = await import("../../api/github-revisions-api");
				const { getAnimeDbDownloader } = await import("./anime-db-download-service");
				let resolveRevisions!: (value: ListAnimeDbRevisionsResult) => void;
				const pendingRevisions       = new Promise<ListAnimeDbRevisionsResult>((resolve) => {
					resolveRevisions = resolve;
				});
				vi.mocked(GitHubRevisionsAPI.listAnimeDbRevisions).mockReturnValue(pendingRevisions);

				const downloader   = getAnimeDbDownloader();
				const startPromise = downloader.start();
				await Promise.resolve();

				await expect(downloader.cancel()).resolves.toEqual({ success: true });
				resolveRevisions({
					revisions:   [
						{
							id:           1,
							tagName:      "v2026.02",
							name:         "v2026.02",
							createdAt:    "2026-02-01T00:00:00Z",
							publishedAt:  "2026-02-01T00:00:00Z",
							isDraft:      false,
							isPrerelease: false,
							assets:       [
								{
									id:          10,
									name:        "anime_data.db",
									size:        100,
									contentType: "application/octet-stream",
									downloadUrl: "https://example.com/anime_data.db",
									createdAt:   "2026-02-01T00:00:00Z",
									updatedAt:   "2026-02-01T00:00:00Z",
									sha256:      VALID_SHA256,
								},
							],
						},
					],
					page:        1,
					perPage:     100,
					hasNextPage: false,
					nextPage:    null,
				});

				await expect(startPromise).resolves.toEqual({ success: true });
				expect(GitHubRevisionsAPI.streamReleaseAssetDownload).not.toHaveBeenCalled();
				expect(setAnimeDbVersionMock).not.toHaveBeenCalled();
				expect(logMainServiceErrorMock).not.toHaveBeenCalled();
				expect(animeDbDownloadProgressNextMock).toHaveBeenCalledWith(expect.objectContaining({
					status: "canceled",
				}));
			},
		);
	},
);
