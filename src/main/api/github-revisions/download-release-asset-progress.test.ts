// @vitest-environment node
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	emitReleaseAssetDownloadProgressIfNeeded,
	initializeReleaseAssetDownloadProgressState,
	toReleaseAssetDownloadProgressPayload,
	updateReleaseAssetDownloadSpeedSample,
} from "./download-release-asset-progress";

describe(
	"release asset download progress model",
	() => {
		afterEach(
			() => {
				vi.useRealTimers();
			},
		);

		it(
			"computes percent, speed, and ETA from sampled byte deltas",
			() => {
				vi.useFakeTimers();
				vi.setSystemTime(0);
				const state         = initializeReleaseAssetDownloadProgressState();
				state.totalBytes    = 2_000;
				state.receivedBytes = 1_000;

				vi.setSystemTime(1_000);
				updateReleaseAssetDownloadSpeedSample(state);

				expect(toReleaseAssetDownloadProgressPayload(state)).toMatchObject({
					receivedBytes:       1_000,
					totalBytes:          2_000,
					percent:             0.5,
					speedBytesPerSecond: 1_000,
					etaSeconds:          1,
				});
			},
		);

		it(
			"throttles progress unless a final emit is forced",
			() => {
				vi.useFakeTimers();
				vi.setSystemTime(0);
				const state         = initializeReleaseAssetDownloadProgressState();
				state.receivedBytes = 5;

				vi.setSystemTime(100);
				expect(emitReleaseAssetDownloadProgressIfNeeded(
					state,
					250,
				)).toBeNull();

				expect(emitReleaseAssetDownloadProgressIfNeeded(
					state,
					250,
					true,
				)).toMatchObject({
					receivedBytes: 5,
				});
			},
		);
	},
);
