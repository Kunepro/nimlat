import { LoggerUtils } from "@nimlat/loggers/main";
import fs from "node:fs";
import path from "node:path";

export async function ensureReleaseAssetDestinationDirectory(destinationPath: string): Promise<void> {
	await fs.promises.mkdir(
		path.dirname(destinationPath),
		{ recursive: true },
	);
}

export async function removePartialReleaseAssetFile(destinationPath: string): Promise<void> {
	try {
		await fs.promises.unlink(destinationPath);
	} catch (error) {
		// Status failures can happen before a file stream exists. Missing partial
		// files are the clean state, not a secondary cleanup warning.
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			return;
		}
		LoggerUtils.logMainWarning(
			"github-revisions.download-release-asset.cleanup",
			"Failed to delete partially downloaded release asset.",
			{
				destinationPath,
				error: error instanceof Error ? error.message : String(error),
			},
		);
	}
}

export async function closeWriteStreamBeforeReleaseAssetCleanup(fileStream: fs.WriteStream | null): Promise<void> {
	if (!fileStream || fileStream.closed) {
		return;
	}

	await new Promise<void>((resolve) => {
		fileStream.once(
			"close",
			resolve,
		);
		fileStream.destroy();
	});
}
