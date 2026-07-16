import { createHash } from "node:crypto";
import fs from "node:fs";
import {
	createAnimeDbDownloadAbortError,
	throwIfAnimeDbDownloadAborted,
} from "./anime-db-download-abort";

export function normalizeSha256(value: string): string | null {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(
			/^sha256[:=\s]+/,
			"",
		);
	return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

async function computeFileSha256(
	filePath: string,
	signal?: AbortSignal,
): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		if (signal?.aborted) {
			reject(createAnimeDbDownloadAbortError("checksum verification"));
			return;
		}

		const hasher = createHash("sha256");
		const stream = fs.createReadStream(filePath);
		let settled  = false;

		const settle = <T>(
			handler: (value: T) => void,
			value: T,
		) => {
			if (settled) {
				return;
			}
			settled = true;
			signal?.removeEventListener(
				"abort",
				abort,
			);
			handler(value);
		};

		const abort = () => {
			const error = createAnimeDbDownloadAbortError("checksum verification");
			stream.destroy(error);
			settle(
				reject,
				error,
			);
		};

		signal?.addEventListener(
			"abort",
			abort,
			{ once: true },
		);

		stream.on(
			"error",
			(error) => {
				settle(
					reject,
					error,
				);
			},
		);

		stream.on(
			"data",
			(chunk: Buffer) => {
				hasher.update(chunk);
			},
		);

		stream.on(
			"end",
			() => {
				settle(
					resolve,
					hasher.digest("hex"),
				);
			},
		);
	});
}

export async function verifyDownloadedDbChecksum(
	tempPath: string,
	expectedChecksumRaw: string | undefined,
	downloadUrl: string,
	version: string | undefined,
	signal?: AbortSignal,
): Promise<void> {
	if (signal) {
		throwIfAnimeDbDownloadAborted(
			signal,
			"checksum verification",
		);
	}

	const expectedChecksum = normalizeSha256(expectedChecksumRaw ?? "");
	if (!expectedChecksum) {
		throw new Error(
			`Downloaded anime DB release '${ version ?? "unknown" }' is missing a valid SHA-256 digest for ${ downloadUrl }.`,
		);
	}

	const actualChecksum = await computeFileSha256(
		tempPath,
		signal,
	);
	if (actualChecksum !== expectedChecksum) {
		throw new Error(
			`Downloaded anime DB checksum mismatch. Expected ${ expectedChecksum }, got ${ actualChecksum }.`,
		);
	}
}
