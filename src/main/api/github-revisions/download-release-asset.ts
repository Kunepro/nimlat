import {
	DownloadReleaseAssetOptions,
	DownloadReleaseAssetResult,
} from "@nimlat/types/github-release-asset-download";
import {
	filter,
	lastValueFrom,
	map,
	Observable,
} from "rxjs";
import {
	type DownloadReleaseAssetEvent,
	isDownloadReleaseAssetCompletedEvent,
} from "./download-release-asset-events";
import { runReleaseAssetDownloadRequest } from "./download-release-asset-request";

type ReleaseAssetDownloadStreamAbort = {
	signal: AbortSignal;
	abort: () => void;
	dispose: () => void;
};

function createReleaseAssetDownloadStreamAbort(sourceSignal?: AbortSignal): ReleaseAssetDownloadStreamAbort {
	const controller = new AbortController();
	let dispose      = () => {};

	// The Observable owns cancellation so unsubscribe behaves like abort, while
	// still honoring any signal passed by the service layer.
	if (sourceSignal) {
		const abortFromSource = () => {
			controller.abort();
		};
		if (sourceSignal.aborted) {
			controller.abort();
		} else {
			sourceSignal.addEventListener(
				"abort",
				abortFromSource,
				{ once: true },
			);
			dispose = () => {
				sourceSignal.removeEventListener(
					"abort",
					abortFromSource,
				);
			};
		}
	}

	return {
		signal: controller.signal,
		abort:  () => {
			if (!controller.signal.aborted) {
				controller.abort();
			}
		},
		dispose,
	};
}

export function streamReleaseAssetDownload(
	options: DownloadReleaseAssetOptions,
): Observable<DownloadReleaseAssetEvent> {
	return new Observable((subscriber) => {
		const streamAbort = createReleaseAssetDownloadStreamAbort(options.signal);
		let isDone        = false;

		void runReleaseAssetDownloadRequest(
			{
				...options,
				signal:       streamAbort.signal,
				progressSink: {
					next: (progress) => {
						if (subscriber.closed) {
							return;
						}

						subscriber.next({
							kind: "progress",
							progress,
						});
					},
				},
			},
		).then((result) => {
			isDone = true;
			streamAbort.dispose();
			if (subscriber.closed) {
				return;
			}
			subscriber.next({
				kind: "completed",
				result,
			});
			subscriber.complete();
		}).catch((error: unknown) => {
			isDone = true;
			streamAbort.dispose();
			if (!subscriber.closed) {
				subscriber.error(error);
			}
		});

		return () => {
			if (!isDone) {
				streamAbort.abort();
			}
			streamAbort.dispose();
		};
	});
}

export function downloadReleaseAsset(
	options: DownloadReleaseAssetOptions,
): Promise<DownloadReleaseAssetResult> {
	return lastValueFrom(streamReleaseAssetDownload(options).pipe(
		filter(isDownloadReleaseAssetCompletedEvent),
		map((event) => event.result),
	));
}
