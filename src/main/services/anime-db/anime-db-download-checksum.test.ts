// @vitest-environment node
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	afterEach,
	describe,
	expect,
	it,
} from "vitest";
import {
	normalizeSha256,
	verifyDownloadedDbChecksum,
} from "./anime-db-download-checksum";

const createdPaths = new Set<string>();

async function createTempChecksumFile(content: string): Promise<string> {
	const filePath = path.join(
		os.tmpdir(),
		`nimlat-anime-db-checksum-${ process.pid }-${ Date.now() }-${ Math.random().toString(36).slice(2) }.db`,
	);
	await fs.promises.writeFile(
		filePath,
		content,
	);
	createdPaths.add(filePath);
	return filePath;
}

function sha256(content: string): string {
	return createHash("sha256")
		.update(content)
		.digest("hex");
}

describe(
	"anime-db download checksum",
	() => {
		afterEach(async () => {
			await Promise.all(Array.from(createdPaths).map(async (filePath) => {
				await fs.promises.rm(
					filePath,
					{ force: true },
				);
				createdPaths.delete(filePath);
			}));
		});

		it(
			"normalizes supported SHA-256 digest formats",
			() => {
				const digest = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

				expect(normalizeSha256(`sha256:${ digest }`)).toBe(digest);
				expect(normalizeSha256(`SHA256 ${ digest.toUpperCase() }`)).toBe(digest);
				expect(normalizeSha256("sha256:not-valid")).toBeNull();
			},
		);

		it(
			"accepts a matching checksum",
			async () => {
				const content  = "anime-db";
				const filePath = await createTempChecksumFile(content);

				await expect(verifyDownloadedDbChecksum(
					filePath,
					`sha256:${ sha256(content) }`,
					"https://example.com/anime_data.db",
					"v2026.07.04",
				)).resolves.toBeUndefined();
			},
		);

		it(
			"honors cancellation before checksum verification starts",
			async () => {
				const filePath        = await createTempChecksumFile("anime-db");
				const abortController = new AbortController();
				abortController.abort();

				await expect(verifyDownloadedDbChecksum(
					filePath,
					`sha256:${ sha256("anime-db") }`,
					"https://example.com/anime_data.db",
					"v2026.07.04",
					abortController.signal,
				)).rejects.toMatchObject({
					name:    "AbortError",
					message: "AnimeDB download canceled during checksum verification.",
				});
			},
		);

		it(
			"rejects downloads that do not provide a valid checksum digest",
			async () => {
				const filePath = await createTempChecksumFile("anime-db");

				await expect(verifyDownloadedDbChecksum(
					filePath,
					undefined,
					"https://example.com/anime_data.db",
					"v1.2.3",
				)).rejects.toThrow(
					"Downloaded anime DB release 'v1.2.3' is missing a valid SHA-256 digest",
				);
			},
		);
	},
);
