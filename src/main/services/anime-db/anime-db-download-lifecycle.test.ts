import {
	describe,
	expect,
	it,
} from "vitest";
import { AnimeDbDownloadLifecycle } from "./anime-db-download-lifecycle";

describe(
	"AnimeDbDownloadLifecycle",
	() => {
		it(
			"rejects overlapping start requests while a release is resolving",
			() => {
				const lifecycle = new AnimeDbDownloadLifecycle();

				expect(lifecycle.beginStartRequest()).toEqual({ accepted: true });
				expect(lifecycle.beginStartRequest()).toEqual({
					accepted: false,
					error:    "Anime database download is already running",
				});
			},
		);

		it(
			"records cancellation before the transfer abort controller exists",
			() => {
				const lifecycle = new AnimeDbDownloadLifecycle();

				lifecycle.beginStartRequest();

				expect(lifecycle.requestCancel()).toBe(true);
				expect(lifecycle.isCancellationRequested()).toBe(true);
				expect(lifecycle.beginRun()).toBeNull();
			},
		);

		it(
			"aborts the active transfer controller when cancellation arrives during the run",
			() => {
				const lifecycle = new AnimeDbDownloadLifecycle();
				lifecycle.beginStartRequest();
				const abortController = lifecycle.beginRun();

				expect(abortController?.signal.aborted).toBe(false);
				expect(lifecycle.requestCancel()).toBe(true);
				expect(abortController?.signal.aborted).toBe(true);
			},
		);

		it(
			"returns to idle after finish",
			() => {
				const lifecycle = new AnimeDbDownloadLifecycle();
				lifecycle.beginStartRequest();
				lifecycle.requestCancel();
				lifecycle.finish();

				expect(lifecycle.isCancellationRequested()).toBe(false);
				expect(lifecycle.beginStartRequest()).toEqual({ accepted: true });
			},
		);
	},
);
