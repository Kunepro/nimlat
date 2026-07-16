import type { DownloadReleaseAssetProgress } from "@nimlat/types/github-release-asset-download";

export type ReleaseAssetDownloadProgressState = {
	receivedBytes: number;
	totalBytes: number | null;
	lastEmitTime: number;
	lastSpeedSampleTime: number;
	lastSpeedSampleBytes: number;
	lastSpeed: number | null;
};

const SPEED_SAMPLE_INTERVAL_MS = 500;

export function initializeReleaseAssetDownloadProgressState(): ReleaseAssetDownloadProgressState {
	const now = Date.now();
	return {
		receivedBytes:        0,
		totalBytes:           null,
		lastEmitTime:         now,
		lastSpeedSampleTime:  now,
		lastSpeedSampleBytes: 0,
		lastSpeed:            null,
	};
}

export function toReleaseAssetDownloadProgressPayload(
	state: ReleaseAssetDownloadProgressState,
): DownloadReleaseAssetProgress {
	const percent    = state.totalBytes ? state.receivedBytes / state.totalBytes : null;
	const etaSeconds = state.totalBytes && state.lastSpeed && state.lastSpeed > 0
		? Math.max(
			0,
			(state.totalBytes - state.receivedBytes) / state.lastSpeed,
		)
		: null;

	return {
		receivedBytes:       state.receivedBytes,
		totalBytes:          state.totalBytes,
		percent,
		speedBytesPerSecond: state.lastSpeed,
		etaSeconds,
	};
}

export function updateReleaseAssetDownloadSpeedSample(state: ReleaseAssetDownloadProgressState): void {
	const now       = Date.now();
	const elapsedMs = now - state.lastSpeedSampleTime;
	if (elapsedMs < SPEED_SAMPLE_INTERVAL_MS) {
		return;
	}

	const bytesDelta           = state.receivedBytes - state.lastSpeedSampleBytes;
	state.lastSpeed            = bytesDelta / (elapsedMs / 1000);
	state.lastSpeedSampleBytes = state.receivedBytes;
	state.lastSpeedSampleTime  = now;
}

export function emitReleaseAssetDownloadProgressIfNeeded(
	state: ReleaseAssetDownloadProgressState,
	progressIntervalMs: number,
	force = false,
): DownloadReleaseAssetProgress | null {
	const now = Date.now();
	if (!force && now - state.lastEmitTime < progressIntervalMs) {
		return null;
	}

	state.lastEmitTime = now;
	return toReleaseAssetDownloadProgressPayload(state);
}
