// @vitest-environment node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
	lastValueFrom,
	toArray,
} from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	downloadReleaseAsset,
	streamReleaseAssetDownload,
} from "./download-release-asset";

const {
				logGitHubReleaseAssetDownloadedMock,
				logMainWarningMock,
			} = vi.hoisted(() => ({
	logGitHubReleaseAssetDownloadedMock: vi.fn(),
	logMainWarningMock:                  vi.fn(),
}));

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils:                     {
			logMainWarning: logMainWarningMock,
		},
		logGitHubReleaseAssetDownloaded: logGitHubReleaseAssetDownloadedMock,
	}),
);

const createdPaths           = new Set<string>();
const servers: http.Server[] = [];

function createTempDestination(): string {
	const destinationPath = path.join(
		os.tmpdir(),
		`nimlat-download-release-asset-${ process.pid }-${ Date.now() }-${ Math.random().toString(36).slice(2) }.bin`,
	);
	createdPaths.add(destinationPath);
	return destinationPath;
}

function listen(server: http.Server): Promise<string> {
	servers.push(server);

	return new Promise((resolve) => {
		server.listen(
			0,
			"127.0.0.1",
			() => {
				const address = server.address();
				if (!address || typeof address === "string") {
					throw new Error("Test server did not bind to a TCP port.");
				}
				resolve(`http://127.0.0.1:${ address.port }/asset.db`);
			},
		);
	});
}

async function closeServer(server: http.Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

async function waitForMissingPath(filePath: string): Promise<void> {
	const deadline = Date.now() + 1_000;
	while (Date.now() < deadline) {
		try {
			await fs.promises.access(filePath);
		} catch {
			return;
		}

		await new Promise((resolve) => {
			setTimeout(
				resolve,
				25,
			);
		});
	}

	throw new Error(`Expected temporary download file to be removed: ${ filePath }`);
}

describe(
	"downloadReleaseAsset",
	() => {
		afterEach(
			async () => {
				await Promise.all(servers.splice(0).map(closeServer));
				await Promise.all(Array.from(createdPaths).map(async (filePath) => {
					await fs.promises.rm(
						filePath,
						{ force: true },
					);
					createdPaths.delete(filePath);
				}));
			},
		);

		it(
			"writes a completed release asset and emits final progress",
			async () => {
				const destinationPath          = createTempDestination();
				const server                   = http.createServer((_request, response) => {
					response.writeHead(
						200,
						{ "content-length": "11" },
					);
					response.end("hello world");
				});
				const url                      = await listen(server);
				const progressValues: number[] = [];

				const events = await lastValueFrom(streamReleaseAssetDownload({
					url,
					destinationPath,
					progressIntervalMs: 0,
				}).pipe(toArray()));
				for (const event of events) {
					if (event.kind === "progress") {
						progressValues.push(event.progress.receivedBytes);
					}
				}

				const completedEvent = events.find((event) => event.kind === "completed");
				expect(completedEvent).toMatchObject({
					result: {
						destinationPath,
						totalBytes: 11,
					},
				});
				await expect(downloadReleaseAsset({
					url,
					destinationPath,
				})).resolves.toMatchObject({ destinationPath });

				await expect(fs.promises.readFile(
					destinationPath,
					"utf8",
				)).resolves.toBe("hello world");
				expect(progressValues.at(-1)).toBe(11);
			},
		);

		it(
			"removes the partial release asset when the response aborts mid-stream",
			async () => {
				const destinationPath = createTempDestination();
				const server          = http.createServer((_request, response) => {
					response.writeHead(
						200,
						{ "content-length": "100" },
					);
					response.write("partial");
					response.destroy(new Error("interrupted"));
				});
				const url             = await listen(server);

				await expect(downloadReleaseAsset({
					url,
					destinationPath,
					progressIntervalMs: 0,
				})).rejects.toThrow();
				await expect(fs.promises.access(destinationPath)).rejects.toThrow();
			},
		);

		it(
			"does not log a cleanup warning when a status failure creates no partial file",
			async () => {
				logMainWarningMock.mockClear();
				const destinationPath = createTempDestination();
				const server          = http.createServer((_request, response) => {
					response.writeHead(
						404,
						{ "content-type": "text/plain" },
					);
					response.end("missing asset");
				});
				const url             = await listen(server);

				await expect(downloadReleaseAsset({
					url,
					destinationPath,
				})).rejects.toMatchObject({
					status:  404,
					details: expect.objectContaining({
						body: "missing asset",
					}),
				});
				await expect(fs.promises.access(destinationPath)).rejects.toThrow();
				expect(logMainWarningMock).not.toHaveBeenCalled();
			},
		);

		it(
			"follows release asset redirects before writing the destination file",
			async () => {
				const destinationPath     = createTempDestination();
				const seenPaths: string[] = [];
				const server              = http.createServer((request, response) => {
					seenPaths.push(request.url ?? "");
					if (request.url === "/asset.db") {
						response.writeHead(
							302,
							{ location: "/redirected-asset.db" },
						);
						response.end();
						return;
					}

					response.writeHead(
						200,
						{ "content-length": "10" },
					);
					response.end("redirected");
				});
				const url                 = await listen(server);

				await expect(downloadReleaseAsset({
					url,
					destinationPath,
					progressIntervalMs: 0,
				})).resolves.toMatchObject({
					destinationPath,
					totalBytes: 10,
				});
				await expect(fs.promises.readFile(
					destinationPath,
					"utf8",
				)).resolves.toBe("redirected");
				expect(seenPaths).toEqual([
					"/asset.db",
					"/redirected-asset.db",
				]);
			},
		);

		it(
			"fails safely when the release asset exceeds the redirect limit",
			async () => {
				logMainWarningMock.mockClear();
				const destinationPath = createTempDestination();
				const server          = http.createServer((_request, response) => {
					response.writeHead(
						302,
						{ location: "/asset.db" },
					);
					response.end();
				});
				const url             = await listen(server);

				await expect(downloadReleaseAsset({
					url,
					destinationPath,
					maxRedirects: 0,
				})).rejects.toThrow("Too many redirects while downloading release asset");
				await expect(fs.promises.access(destinationPath)).rejects.toThrow();
				expect(logMainWarningMock).not.toHaveBeenCalled();
			},
		);

		it(
			"cancels the in-flight release asset download when the stream subscription is disposed",
			async () => {
				const destinationPath                                      = createTempDestination();
				let resolveResponseClosed: (() => void) | null             = null;
				const responseClosed                                       = new Promise<void>((resolve) => {
					resolveResponseClosed = resolve;
				});
				const server                                               = http.createServer((_request, response) => {
					response.on(
						"close",
						() => resolveResponseClosed?.(),
					);
					response.writeHead(
						200,
						{ "content-length": "100" },
					);
					response.write("partial");
				});
				const url                                                  = await listen(server);
				let resolveFirstProgress: (() => void) | null              = null;
				let rejectFirstProgress: ((error: unknown) => void) | null = null;
				const firstProgress                                        = new Promise<void>((resolve, reject) => {
					resolveFirstProgress = resolve;
					rejectFirstProgress  = reject;
				});
				const subscription                                         = streamReleaseAssetDownload({
					url,
					destinationPath,
					progressIntervalMs: 0,
				}).subscribe({
					next:  (event) => {
						if (event.kind === "progress") {
							resolveFirstProgress?.();
						}
					},
					error: (error: unknown) => rejectFirstProgress?.(error),
				});

				await firstProgress;
				subscription.unsubscribe();

				await responseClosed;
				await waitForMissingPath(destinationPath);
			},
		);
	},
);
