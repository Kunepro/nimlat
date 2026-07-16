import { PATH_DATA } from "@nimlat/constants/main/system-folders";
import { AnimeDbFacade } from "@nimlat/database";
import type { DownloadReleaseAssetProgress } from "@nimlat/types/github-release-asset-download";
import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import fs from "node:fs";
import path from "node:path";
import {
	filter,
	lastValueFrom,
	map,
	Observable,
	tap,
} from "rxjs";
import { GitHubRevisionsAPI } from "../../api/github-revisions-api";
import { isDownloadReleaseAssetCompletedEvent } from "../../api/github-revisions/download-release-asset-events";
import { throwIfAnimeDbDownloadAborted } from "./anime-db-download-abort";
import { verifyDownloadedDbChecksum } from "./anime-db-download-checksum";
import {
	type AnimeDbReplacementCommit,
	replaceAnimeDbFromDownload,
} from "./anime-db-file-replacement";

export type AnimeDbDownloadRunEvent =
	| {
	action: "transferProgress";
	progress: DownloadReleaseAssetProgress;
}
	| {
	action: "statusChanged";
	status: Extract<AnimeDbDownloadProgressData["status"], "verifying" | "replacing">;
}
	| {
	action: "replacementCommitted";
	commit: AnimeDbReplacementCommit;
};

export type AnimeDbDownloadRunOptions = {
	url: string;
	version: string;
	checksumSha256?: string;
	tempPath: string;
	signal: AbortSignal;
};

const DOWNLOAD_TEMP_FILENAME = "anime_data.db.download";

export function getAnimeDbDownloadTempPath(): string {
	return path.join(
		PATH_DATA,
		DOWNLOAD_TEMP_FILENAME,
	);
}

// Runs the irreversible file workflow after release resolution. The runner is
// reactive at its boundary: callers subscribe to phase/progress events and own
// how those events affect BUS-visible state.
export function streamAnimeDbDownloadReplacement(options: AnimeDbDownloadRunOptions): Observable<AnimeDbDownloadRunEvent> {
	return new Observable((subscriber) => {
		void (async () => {
			await fs.promises.mkdir(
				PATH_DATA,
				{ recursive: true },
			);
			throwIfAnimeDbDownloadAborted(
				options.signal,
				"download preparation",
			);

			await lastValueFrom(GitHubRevisionsAPI.streamReleaseAssetDownload({
				url:             options.url,
				destinationPath: options.tempPath,
				signal:          options.signal,
			}).pipe(
				tap((event) => {
					if (event.kind !== "progress") {
						return;
					}

					subscriber.next({
						action:   "transferProgress",
						progress: event.progress,
					});
				}),
				filter(isDownloadReleaseAssetCompletedEvent),
				map((event) => event.result),
			));
			throwIfAnimeDbDownloadAborted(
				options.signal,
				"checksum verification",
			);

			subscriber.next({
				action: "statusChanged",
				status: "verifying",
			});

			await verifyDownloadedDbChecksum(
				options.tempPath,
				options.checksumSha256,
				options.url,
				options.version,
				options.signal,
			);
			throwIfAnimeDbDownloadAborted(
				options.signal,
				"reconcile safety check",
			);
			AnimeDbFacade.metadata.assertFileReconcileSafety(options.tempPath);
			throwIfAnimeDbDownloadAborted(
				options.signal,
				"database replacement",
			);

			subscriber.next({
				action: "statusChanged",
				status: "replacing",
			});

			const commit = await replaceAnimeDbFromDownload(options.tempPath);
			subscriber.next({
				action: "replacementCommitted",
				commit,
			});
		})().then(
			() => subscriber.complete(),
			(error: unknown) => subscriber.error(error),
		);
	});
}
