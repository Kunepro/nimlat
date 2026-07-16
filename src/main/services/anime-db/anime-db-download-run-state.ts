import type { DownloadReleaseAssetProgress } from "@nimlat/types/github-release-asset-download";
import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";

function createIdleAnimeDbDownloadProgress(): AnimeDbDownloadProgressData {
	return {
		status:              "idle",
		receivedBytes:       0,
		totalBytes:          null,
		percent:             null,
		speedBytesPerSecond: null,
		etaSeconds:          null,
	};
}

// Owns transient download progress state. The downloader service publishes this
// state to BUS, but the mutation rules stay here so download phases are easy to test.
export class AnimeDbDownloadRunState {
	private currentProgress: AnimeDbDownloadProgressData = createIdleAnimeDbDownloadProgress();

	public getProgress(): AnimeDbDownloadProgressData {
		return { ...this.currentProgress };
	}

	public markStarted(version: string): void {
		this.currentProgress = {
			status:              "downloading",
			receivedBytes:       0,
			totalBytes:          null,
			percent:             null,
			speedBytesPerSecond: null,
			etaSeconds: null,
			version,
		};
	}

	// Reconcile-only retries must not pretend a second network transfer occurred.
	// Start from a fresh terminal-safe snapshot while retaining the installed target.
	public markReconcileStarted(version: string): void {
		this.currentProgress = {
			status:              "reconciling",
			receivedBytes:       0,
			totalBytes:          null,
			percent:             1,
			speedBytesPerSecond: null,
			etaSeconds:          null,
			version,
		};
	}

	public updateTransferProgress(progress: DownloadReleaseAssetProgress): void {
		this.currentProgress = {
			...this.currentProgress,
			receivedBytes:       progress.receivedBytes,
			totalBytes:          progress.totalBytes,
			percent:             progress.percent,
			speedBytesPerSecond: progress.speedBytesPerSecond,
			etaSeconds:          progress.etaSeconds,
		};
	}

	public setStatus(
		status: AnimeDbDownloadProgressData["status"],
		extra: Partial<AnimeDbDownloadProgressData> = {},
	): void {
		this.currentProgress = {
			...this.currentProgress,
			status,
			...extra,
		};
	}

	public markCompleted(): void {
		this.setStatus(
			"completed",
			{ percent: 1 },
		);
	}

	public markCanceled(): void {
		this.setStatus("canceled");
	}

	public markError(errorMessage: string): void {
		this.setStatus(
			"error",
			{ errorMessage },
		);
	}
}
