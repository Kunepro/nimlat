import { ANIME_DB_RELEASE_SOURCE } from "@nimlat/constants/main/anime-db-release-source";
import type {
	AnimeDbReleaseSourceConfig,
	GitHubRevision,
	GitHubRevisionAsset,
} from "@nimlat/types/github-revisions";
import { GitHubRevisionsAPI } from "../../api/github-revisions-api";
import { normalizeSha256 } from "./anime-db-download-checksum";

type ResolvedLatestRelease = {
	revisionTag: string;
	dbAsset: GitHubRevisionAsset;
	checksumSha256: string;
};

type RevisionSelection = {
	stableRevision: GitHubRevision | null;
	firstPrereleaseRevision: GitHubRevision | null;
};

const RELEASES_PAGE_SIZE = 100;
const MAX_RELEASES_PAGES = 10;

// GitHub releases are ordered newest-first; prefer a stable release, but keep the first prerelease as a fallback.
function findPreferredRevisionInPage(
	revisions: GitHubRevision[],
	hasDownloadableDbAsset: (revision: GitHubRevision) => boolean,
): RevisionSelection {
	let stableRevision: GitHubRevision | null          = null;
	let firstPrereleaseRevision: GitHubRevision | null = null;

	for (const revision of revisions) {
		if (!hasDownloadableDbAsset(revision) || revision.isDraft) {
			continue;
		}

		if (!revision.isPrerelease) {
			stableRevision = revision;
			break;
		}

		if (!firstPrereleaseRevision) {
			firstPrereleaseRevision = revision;
		}
	}

	return {
		stableRevision,
		firstPrereleaseRevision,
	};
}

export function getValidatedAnimeDbReleaseSourceConfig(): AnimeDbReleaseSourceConfig {
	if (!ANIME_DB_RELEASE_SOURCE.owner || !ANIME_DB_RELEASE_SOURCE.repo) {
		throw new Error(
			"Anime DB release source is not configured. Set ANIME_DB_RELEASE_SOURCE owner/repo constants.",
		);
	}

	return ANIME_DB_RELEASE_SOURCE;
}

function resolveAnimeDbAssetsFromRevision(
	assets: GitHubRevisionAsset[],
	config: AnimeDbReleaseSourceConfig,
): GitHubRevisionAsset[] {
	return assets.filter((asset) =>
		asset.name.toLowerCase().includes(config.dbAssetNameIncludes.toLowerCase())
		&& asset.name.toLowerCase().endsWith(config.dbAssetNameEndsWith.toLowerCase()));
}

function resolveChecksumSha256FromDigest(dbAsset: GitHubRevisionAsset): string | undefined {
	return normalizeSha256(dbAsset.sha256 ?? "") ?? undefined;
}

export function resolveDownloadableAnimeDbAssetFromRevision(
	assets: GitHubRevisionAsset[],
	config: AnimeDbReleaseSourceConfig,
): GitHubRevisionAsset | undefined {
	return resolveAnimeDbAssetsFromRevision(
		assets,
		config,
	).find((asset) => resolveChecksumSha256FromDigest(asset));
}

export async function findLatestDownloadableAnimeDbRevision(
	sourceConfig: AnimeDbReleaseSourceConfig,
): Promise<GitHubRevision | null> {
	let page                                       = 1;
	let firstDraftlessMatch: GitHubRevision | null = null;

	while (page <= MAX_RELEASES_PAGES) {
		const listResult = await GitHubRevisionsAPI.listAnimeDbRevisions({
			owner:   sourceConfig.owner,
			repo:    sourceConfig.repo,
			page,
			perPage: RELEASES_PAGE_SIZE,
		});

		const pageSelection = findPreferredRevisionInPage(
			listResult.revisions,
			(revision) => Boolean(resolveDownloadableAnimeDbAssetFromRevision(
				revision.assets,
				sourceConfig,
			)),
		);
		if (pageSelection.stableRevision) {
			return pageSelection.stableRevision;
		}
		if (!firstDraftlessMatch && pageSelection.firstPrereleaseRevision) {
			firstDraftlessMatch = pageSelection.firstPrereleaseRevision;
		}

		if (!listResult.hasNextPage || !listResult.nextPage) {
			break;
		}

		page = listResult.nextPage;
	}

	return firstDraftlessMatch;
}

export async function resolveLatestAnimeDbRelease(
	sourceConfig: AnimeDbReleaseSourceConfig,
): Promise<ResolvedLatestRelease> {
	const latestRevision = await findLatestDownloadableAnimeDbRevision(sourceConfig);
	if (!latestRevision) {
		throw new Error("No valid anime DB revisions available on GitHub releases.");
	}
	if (latestRevision.tagName.trim().length === 0) {
		throw new Error("Downloaded anime DB release is missing a version tag.");
	}

	const dbAsset = resolveDownloadableAnimeDbAssetFromRevision(
		latestRevision.assets,
		sourceConfig,
	);
	if (!dbAsset) {
		throw new Error(`No anime DB asset with a valid SHA-256 digest found in latest release '${ latestRevision.tagName }'.`);
	}
	const checksumSha256 = resolveChecksumSha256FromDigest(dbAsset);
	if (!checksumSha256) {
		throw new Error(`No valid SHA-256 digest found in latest release '${ latestRevision.tagName }'.`);
	}

	return {
		revisionTag: latestRevision.tagName,
		dbAsset,
		checksumSha256,
	};
}
