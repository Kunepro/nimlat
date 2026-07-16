import {
	describe,
	expect,
	it,
} from "vitest";
import { AnimeDbDownloadRunState } from "./anime-db-download-run-state";

describe(
	"AnimeDbDownloadRunState",
	() => {
		it(
			"starts a fresh downloading progress snapshot for the target version",
			() => {
				const state = new AnimeDbDownloadRunState();

				state.markStarted("v2026.07");

				expect(state.getProgress()).toEqual({
					status:              "downloading",
					receivedBytes:       0,
					totalBytes:          null,
					percent:             null,
					speedBytesPerSecond: null,
					etaSeconds:          null,
					version:             "v2026.07",
				});
			},
		);

		it(
			"applies transfer metrics without losing current phase metadata",
			() => {
				const state = new AnimeDbDownloadRunState();
				state.markStarted("v2026.07");

				state.updateTransferProgress({
					receivedBytes:       50,
					totalBytes:          100,
					percent:             0.5,
					speedBytesPerSecond: 10,
					etaSeconds:          5,
				});

				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:              "downloading",
					version:             "v2026.07",
					receivedBytes:       50,
					totalBytes:          100,
					percent:             0.5,
					speedBytesPerSecond: 10,
					etaSeconds:          5,
				}));
			},
		);

		it(
			"starts reconcile-only retry without reporting a second download",
			() => {
				const state = new AnimeDbDownloadRunState();
				state.markError("prior failure");

				state.markReconcileStarted("v2026.07");

				expect(state.getProgress()).toEqual({
					status:              "reconciling",
					receivedBytes:       0,
					totalBytes:          null,
					percent:             1,
					speedBytesPerSecond: null,
					etaSeconds:          null,
					version:             "v2026.07",
				});
			},
		);

		it(
			"marks terminal statuses with the expected progress payload",
			() => {
				const state = new AnimeDbDownloadRunState();
				state.markStarted("v2026.07");

				state.markCompleted();
				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:  "completed",
					percent: 1,
				}));

				state.markError("checksum failed");
				expect(state.getProgress()).toEqual(expect.objectContaining({
					status:       "error",
					errorMessage: "checksum failed",
				}));

				state.markCanceled();
				expect(state.getProgress()).toEqual(expect.objectContaining({
					status: "canceled",
				}));
			},
		);
	},
);
