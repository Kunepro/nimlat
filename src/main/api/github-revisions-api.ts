import type {
	DownloadReleaseAssetOptions,
	DownloadReleaseAssetResult,
} from "@nimlat/types/github-release-asset-download";
import type {
	ListAnimeDbRevisionsOptions,
	ListAnimeDbRevisionsResult,
} from "@nimlat/types/github-revisions";
import type { Observable } from "rxjs";
import {
	downloadReleaseAsset,
	streamReleaseAssetDownload,
} from "./github-revisions/download-release-asset";
import type { DownloadReleaseAssetEvent } from "./github-revisions/download-release-asset-events";
import { listAnimeDbRevisions } from "./github-revisions/list-anime-db-revisions";

export class GitHubRevisionsAPI {
	// Transport boundary for AnimeDB revision lookup and asset transfer. Helpers
	// emit download/revision diagnostics and progress events but own no UI state.
	static downloadReleaseAsset(options: DownloadReleaseAssetOptions): Promise<DownloadReleaseAssetResult> {
		return downloadReleaseAsset(options);
	}

	static streamReleaseAssetDownload(options: DownloadReleaseAssetOptions): Observable<DownloadReleaseAssetEvent> {
		return streamReleaseAssetDownload(options);
	}

	static listAnimeDbRevisions(options: ListAnimeDbRevisionsOptions): Promise<ListAnimeDbRevisionsResult> {
		return listAnimeDbRevisions(options);
	}
}
