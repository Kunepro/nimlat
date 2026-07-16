export interface GitHubRevisionAsset {
	id: number;
	name: string;
	size: number;
	contentType: string;
	downloadUrl: string;
	createdAt: string;
	updatedAt: string;
	sha256?: string;
}

export interface GitHubRevision {
	id: number;
	tagName: string;
	name: string;
	createdAt: string;
	publishedAt: string | null;
	isDraft: boolean;
	isPrerelease: boolean;
	assets: GitHubRevisionAsset[];
}

export interface ListAnimeDbRevisionsOptions {
	owner: string;
	repo: string;
	page?: number;
	perPage?: number;
	assetNameIncludes?: string;
	assetNameEndsWith?: string;
}

export interface ListAnimeDbRevisionsResult {
	revisions: GitHubRevision[];
	page: number;
	perPage: number;
	hasNextPage: boolean;
	nextPage: number | null;
}

export interface AnimeDbReleaseSourceConfig {
	owner: string;
	repo: string;
	dbAssetNameIncludes: string;
	dbAssetNameEndsWith: string;
}
