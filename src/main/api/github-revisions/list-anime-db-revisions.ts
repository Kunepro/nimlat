import { logGitHubAnimeDbRevisions } from "@nimlat/loggers/main";
import {
	GitHubRevision,
	GitHubRevisionAsset,
	ListAnimeDbRevisionsOptions,
	ListAnimeDbRevisionsResult,
} from "@nimlat/types/github-revisions";
import { Octokit } from "@octokit/rest";

type ReleaseAssetNameFilters = {
	includeMatch?: string;
	endsWithMatch?: string;
};

function createNameFilters(options: ListAnimeDbRevisionsOptions): ReleaseAssetNameFilters {
	return {
		includeMatch:  options.assetNameIncludes?.toLowerCase(),
		endsWithMatch: options.assetNameEndsWith?.toLowerCase(),
	};
}

function matchesAssetName(
	assetName: string,
	filters: ReleaseAssetNameFilters,
): boolean {
	const assetNameLower = assetName.toLowerCase();
	if (filters.includeMatch && !assetNameLower.includes(filters.includeMatch)) {
		return false;
	}
	// noinspection RedundantIfStatementJS
	if (filters.endsWithMatch && !assetNameLower.endsWith(filters.endsWithMatch)) {
		return false;
	}
	return true;
}

function extractSha256Digest(asset: { digest?: unknown }): string | undefined {
	return typeof asset.digest === "string" ? asset.digest : undefined;
}

function mapReleaseAsset(asset: {
	id: number;
	name: string;
	size: number;
	content_type: string;
	browser_download_url: string;
	created_at: string;
	updated_at: string;
	digest?: unknown;
}): GitHubRevisionAsset {
	return {
		id:          asset.id,
		name:        asset.name,
		size:        asset.size,
		contentType: asset.content_type,
		downloadUrl: asset.browser_download_url,
		createdAt:   asset.created_at,
		updatedAt:   asset.updated_at,
		sha256:      extractSha256Digest(asset),
	};
}

function mapReleaseToRevision(release: {
	id: number;
	tag_name: string;
	name: string | null;
	created_at: string;
	published_at: string | null;
	draft: boolean;
	prerelease: boolean;
	assets: Array<{
		id: number;
		name: string;
		size: number;
		content_type: string;
		browser_download_url: string;
		created_at: string;
		updated_at: string;
		digest?: unknown;
	}>;
}, filters: ReleaseAssetNameFilters): GitHubRevision {
	const assets = release.assets
		.filter((asset) => matchesAssetName(
			asset.name,
			filters,
		))
		.map(mapReleaseAsset);

	return {
		id:           release.id,
		tagName:      release.tag_name,
		name:         release.name ?? release.tag_name,
		createdAt:    release.created_at,
		publishedAt:  release.published_at,
		isDraft:      release.draft,
		isPrerelease: release.prerelease,
		assets,
	};
}

function sortRevisionsByDateDesc(revisions: GitHubRevision[]): GitHubRevision[] {
	return revisions.sort((left, right) => {
		const leftDate  = left.publishedAt ?? left.createdAt;
		const rightDate = right.publishedAt ?? right.createdAt;
		return rightDate.localeCompare(leftDate);
	});
}

function hasNextPageFromLinkHeader(linkHeader: string | undefined): boolean {
	return (linkHeader ?? "").includes("rel=\"next\"");
}

export async function listAnimeDbRevisions(
	options: ListAnimeDbRevisionsOptions,
): Promise<ListAnimeDbRevisionsResult> {
	const {
					owner,
					repo,
					page    = 1,
					perPage = 30,
				} = options;

	const octokit = new Octokit();

	const response = await octokit.repos.listReleases({
		owner,
		repo,
		page,
		per_page: perPage,
	});

	// Release filtering is driven by hardcoded source config.
	const filters   = createNameFilters(options);
	const revisions = sortRevisionsByDateDesc(
		response.data.map((release) => mapReleaseToRevision(
			release,
			filters,
		)),
	);

	const hasNextPage = hasNextPageFromLinkHeader(response.headers.link);

	const result = {
		revisions,
		page,
		perPage,
		hasNextPage,
		nextPage: hasNextPage ? page + 1 : null,
	};
	logGitHubAnimeDbRevisions(
		result,
		{
			owner,
			repo,
			page,
			perPage,
		},
	);
	return result;
}
