import { logGitHubReleaseAssetDownloaded } from "@nimlat/loggers/main";
import {
	DownloadReleaseAssetOptions,
	DownloadReleaseAssetProgress,
	DownloadReleaseAssetResult,
} from "@nimlat/types/github-release-asset-download";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import {
	closeWriteStreamBeforeReleaseAssetCleanup,
	ensureReleaseAssetDestinationDirectory,
	removePartialReleaseAssetFile,
} from "./download-release-asset-file-utils";
import {
	createReleaseAssetDownloadAbortHandler,
	createReleaseAssetDownloadStatusError,
	parseReleaseAssetTotalBytesFromHeaders,
} from "./download-release-asset-http-utils";
import {
	emitReleaseAssetDownloadProgressIfNeeded,
	initializeReleaseAssetDownloadProgressState,
	updateReleaseAssetDownloadSpeedSample,
} from "./download-release-asset-progress";

const DEFAULT_MAX_REDIRECTS        = 5;
const DEFAULT_PROGRESS_INTERVAL_MS = 250;

type ReleaseAssetDownloadProgressSink = {
	next(progress: DownloadReleaseAssetProgress): void;
};

type ReleaseAssetDownloadRequestOptions = DownloadReleaseAssetOptions & {
	progressSink?: ReleaseAssetDownloadProgressSink;
};

function emitProgressEvent(
	progressSink: ReleaseAssetDownloadProgressSink | undefined,
	state: ReturnType<typeof initializeReleaseAssetDownloadProgressState>,
	progressIntervalMs: number,
	force = false,
): void {
	const progress = emitReleaseAssetDownloadProgressIfNeeded(
		state,
		progressIntervalMs,
		force,
	);
	if (!progress) {
		return;
	}

	progressSink?.next(progress);
}

export async function runReleaseAssetDownloadRequest(
	options: ReleaseAssetDownloadRequestOptions,
): Promise<DownloadReleaseAssetResult> {
	const {
					url,
					destinationPath,
					headers,
					signal,
					requestTimeoutMs,
					progressSink,
					maxRedirects       = DEFAULT_MAX_REDIRECTS,
					progressIntervalMs = DEFAULT_PROGRESS_INTERVAL_MS,
				} = options;

	await ensureReleaseAssetDestinationDirectory(destinationPath);
	const initialUrl = new URL(url);

	// Owns the Node HTTP/file-stream lifecycle for one release asset transfer.
	// The RxJS wrapper intentionally stays outside this module so unsubscribe
	// semantics cannot leak into request/cleanup code.
	return await new Promise<DownloadReleaseAssetResult>((resolve, reject) => {
		const state                                 = initializeReleaseAssetDownloadProgressState();
		let activeFileStream: fs.WriteStream | null = null;
		let isSettled                               = false;

		const fail = async (error: unknown) => {
			if (isSettled) {
				return;
			}
			isSettled = true;
			await closeWriteStreamBeforeReleaseAssetCleanup(activeFileStream);
			await removePartialReleaseAssetFile(destinationPath);
			reject(error);
		};

		const requestWithRedirects = (currentUrl: URL, redirectsRemaining: number) => {
			const transport                              = currentUrl.protocol === "https:" ? https : http;
			let request: http.ClientRequest | null       = null;
			let responseRef: http.IncomingMessage | null = null;
			const abortHandler                           = createReleaseAssetDownloadAbortHandler(
				() => request,
				() => responseRef,
			);

			request = transport.request(
				{
					method:   "GET",
					headers:  {
						"User-Agent": "nimlat",
						...headers,
					},
					hostname: currentUrl.hostname,
					port:     currentUrl.port,
					path:     `${ currentUrl.pathname }${ currentUrl.search }`,
				},
				(response) => {
					responseRef  = response;
					const status = response.statusCode ?? 0;

					if (status >= 300 && status < 400 && response.headers.location) {
						response.resume();
						if (signal) {
							signal.removeEventListener(
								"abort",
								abortHandler,
							);
						}

						if (redirectsRemaining <= 0) {
							void fail(new Error("Too many redirects while downloading release asset"));
							return;
						}

						const redirectUrl = new URL(
							response.headers.location,
							currentUrl,
						);
						requestWithRedirects(
							redirectUrl,
							redirectsRemaining - 1,
						);
						return;
					}

					if (status < 200 || status >= 300) {
						if (signal) {
							signal.removeEventListener(
								"abort",
								abortHandler,
							);
						}
						void createReleaseAssetDownloadStatusError(
							status,
							response,
							currentUrl,
						).then(fail);
						return;
					}

					state.totalBytes = parseReleaseAssetTotalBytesFromHeaders(response);
					const fileStream = fs.createWriteStream(destinationPath);
					activeFileStream = fileStream;

					response.on(
						"data",
						(chunk: Buffer) => {
							state.receivedBytes += chunk.length;
							updateReleaseAssetDownloadSpeedSample(state);
							emitProgressEvent(
								progressSink,
								state,
								progressIntervalMs,
							);
						},
					);

					response.on(
						"aborted",
						() => {
							void fail(new Error("Download response aborted before the release asset was fully received"));
						},
					);

					response.on(
						"error",
						(error) => {
							void fail(error);
						},
					);

					fileStream.on(
						"error",
						(error) => {
							void fail(error);
						},
					);

					response.pipe(fileStream);

					fileStream.on(
						"finish",
						() => {
							if (isSettled) {
								return;
							}
							isSettled = true;
							emitProgressEvent(
								progressSink,
								state,
								progressIntervalMs,
								true,
							);
							const result = {
								destinationPath,
								totalBytes: state.totalBytes,
							};
							logGitHubReleaseAssetDownloaded(
								result,
								{
									url,
									destinationPath,
								},
							);
							resolve(result);
						},
					);

					fileStream.on(
						"close",
						() => {
							activeFileStream = null;
							if (signal) {
								signal.removeEventListener(
									"abort",
									abortHandler,
								);
							}
						},
					);
				},
			);

			request.on(
				"error",
				(error) => {
					void fail(error);
				},
			);

			if (signal) {
				if (signal.aborted) {
					abortHandler();
					return;
				}
				signal.addEventListener(
					"abort",
					abortHandler,
					{ once: true },
				);
			}

			if (requestTimeoutMs) {
				request.setTimeout(
					requestTimeoutMs,
					() => {
						request?.destroy(new Error("Download request timed out"));
					},
				);
			}

			request.end();
		};

		requestWithRedirects(
			initialUrl,
			maxRedirects,
		);
	});
}
