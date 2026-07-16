export interface DownloadReleaseAssetProgress {
	receivedBytes: number;
	totalBytes: number | null;
	percent: number | null;
	speedBytesPerSecond: number | null;
	etaSeconds: number | null;
}

export interface DownloadReleaseAssetOptions {
	url: string;
	destinationPath: string;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	requestTimeoutMs?: number;
	maxRedirects?: number;
	progressIntervalMs?: number;
}

export interface DownloadReleaseAssetResult {
	destinationPath: string;
	totalBytes: number | null;
}
