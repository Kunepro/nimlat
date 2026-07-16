import type {
	DownloadReleaseAssetProgress,
	DownloadReleaseAssetResult,
} from "@nimlat/types/github-release-asset-download";

export type DownloadReleaseAssetEvent =
	| {
	kind: "progress";
	progress: DownloadReleaseAssetProgress;
}
	| {
	kind: "completed";
	result: DownloadReleaseAssetResult;
};

export function isDownloadReleaseAssetCompletedEvent(
	event: DownloadReleaseAssetEvent,
): event is Extract<DownloadReleaseAssetEvent, { kind: "completed" }> {
	return event.kind === "completed";
}
