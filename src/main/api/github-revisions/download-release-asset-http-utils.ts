import http from "node:http";

export function parseReleaseAssetTotalBytesFromHeaders(response: http.IncomingMessage): number | null {
	const lengthHeader = response.headers[ "content-length" ];
	if (!lengthHeader) {
		return null;
	}

	const parsed = Number(lengthHeader);
	return Number.isFinite(parsed) ? parsed : null;
}

export function createReleaseAssetDownloadAbortHandler(
	requestRef: () => http.ClientRequest | null,
	responseRef: () => http.IncomingMessage | null,
): () => void {
	return () => {
		responseRef()?.destroy(new Error("Download aborted"));
		requestRef()?.destroy(new Error("Download aborted"));
	};
}

async function readIncomingMessageBody(response: http.IncomingMessage): Promise<string | null> {
	return await new Promise((resolve) => {
		const chunks: Buffer[] = [];
		let receivedBytes      = 0;
		response.on(
			"data",
			(chunk: Buffer) => {
				if (receivedBytes >= 2_000) {
					return;
				}
				const remainingBytes = 2_000 - receivedBytes;
				const selectedChunk  = chunk.length > remainingBytes
					? chunk.subarray(
						0,
						remainingBytes,
					)
					: chunk;
				chunks.push(selectedChunk);
				receivedBytes += selectedChunk.length;
			},
		);
		response.on(
			"end",
			() => {
				const body = Buffer.concat(chunks).toString("utf8").trim();
				resolve(body || null);
			},
		);
		response.on(
			"error",
			() => resolve(null),
		);
	});
}

export async function createReleaseAssetDownloadStatusError(
	status: number,
	response: http.IncomingMessage,
	currentUrl: URL,
): Promise<Error> {
	const error   = new Error(`Download failed with status ${ status }`) as Error & {
		status: number;
		details: {
			url: string;
			statusText: string;
			retryAfter: string | null;
			headers: http.IncomingHttpHeaders;
			body: string | null;
		};
	};
	error.status  = status;
	error.details = {
		url:        currentUrl.toString(),
		statusText: response.statusMessage ?? "",
		retryAfter: typeof response.headers[ "retry-after" ] === "string" ? response.headers[ "retry-after" ] : null,
		headers:    response.headers,
		body:       await readIncomingMessageBody(response),
	};
	return error;
}
