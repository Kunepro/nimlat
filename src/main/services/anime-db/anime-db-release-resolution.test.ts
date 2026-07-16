// @vitest-environment node
import type {
	AnimeDbReleaseSourceConfig,
	GitHubRevision,
	GitHubRevisionAsset,
} from "@nimlat/types/github-revisions";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	findLatestDownloadableAnimeDbRevision,
	resolveDownloadableAnimeDbAssetFromRevision,
	resolveLatestAnimeDbRelease,
} from "./anime-db-release-resolution";

const VALID_SHA256       = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_VALID_SHA256 = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const listAnimeDbRevisionsMock = vi.hoisted(() => vi.fn());

vi.mock(
	"../../api/github-revisions-api",
	() => ({
		GitHubRevisionsAPI: {
			listAnimeDbRevisions: listAnimeDbRevisionsMock,
		},
	}),
);

const sourceConfig: AnimeDbReleaseSourceConfig = {
	owner:               "owner",
	repo:                "repo",
	dbAssetNameIncludes: "anime_data",
	dbAssetNameEndsWith: ".db",
};

function assetFixture(overrides: Partial<GitHubRevisionAsset> = {}): GitHubRevisionAsset {
	return {
		id:          1,
		name:        "anime_data.db",
		size:        100,
		contentType: "application/octet-stream",
		downloadUrl: "https://example.com/anime_data.db",
		createdAt:   "2026-07-01T00:00:00Z",
		updatedAt:   "2026-07-01T00:00:00Z",
		sha256:      VALID_SHA256,
		...overrides,
	};
}

function revisionFixture(overrides: Partial<GitHubRevision> = {}): GitHubRevision {
	return {
		id:           1,
		tagName:      "v2026.07",
		name:         "v2026.07",
		createdAt:    "2026-07-01T00:00:00Z",
		publishedAt:  "2026-07-01T00:00:00Z",
		isDraft:      false,
		isPrerelease: false,
		assets:       [ assetFixture() ],
		...overrides,
	};
}

function mockRevisionPage(revisions: GitHubRevision[]): void {
	listAnimeDbRevisionsMock.mockResolvedValue({
		revisions,
		page:        1,
		perPage:     100,
		hasNextPage: false,
		nextPage:    null,
	});
}

describe(
	"anime DB release resolution",
	() => {
		it(
			"selects the first matching AnimeDB asset that also has a valid checksum",
			() => {
				const asset = resolveDownloadableAnimeDbAssetFromRevision(
					[
						assetFixture({
							id:     1,
							sha256: "sha256:not-valid",
						}),
						assetFixture({
							id:     2,
							name:   "anime_data_v1.db",
							sha256: OTHER_VALID_SHA256,
						}),
					],
					sourceConfig,
				);

				expect(asset).toMatchObject({
					id:     2,
					sha256: OTHER_VALID_SHA256,
				});
			},
		);

		it(
			"skips releases whose matching DB assets do not expose valid checksums",
			async () => {
				mockRevisionPage([
					revisionFixture({
						id:      1,
						tagName: "v2026.08",
						assets:  [
							assetFixture({ sha256: undefined }),
							assetFixture({
								id:     2,
								sha256: "sha256:not-valid",
							}),
						],
					}),
					revisionFixture({
						id:      3,
						tagName: "v2026.07",
					}),
				]);

				await expect(findLatestDownloadableAnimeDbRevision(sourceConfig)).resolves.toMatchObject({
					id:      3,
					tagName: "v2026.07",
				});
			},
		);

		it(
			"resolves the downloadable asset and normalized checksum from the selected release",
			async () => {
				mockRevisionPage([
					revisionFixture({
						tagName: "v2026.07",
						assets:  [
							assetFixture({
								id:     1,
								sha256: "sha256:not-valid",
							}),
							assetFixture({
								id:     2,
								name:   "anime_data_v1.db",
								sha256: OTHER_VALID_SHA256,
							}),
						],
					}),
				]);

				await expect(resolveLatestAnimeDbRelease(sourceConfig)).resolves.toMatchObject({
					revisionTag:    "v2026.07",
					dbAsset:        {
						id: 2,
					},
					checksumSha256: OTHER_VALID_SHA256.replace(
						"sha256:",
						"",
					),
				});
			},
		);
	},
);
