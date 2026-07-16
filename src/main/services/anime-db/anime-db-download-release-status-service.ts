import { UserDbFacade } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { AnimeDbDownloadReleaseStatus } from "@nimlat/types/ipc-payloads";
import {
	getValidatedAnimeDbReleaseSourceConfig,
	resolveLatestAnimeDbRelease,
} from "./anime-db-release-resolution";

function normalizeRuntimeError(error: unknown): Error {
	return error instanceof Error
		? error
		: new Error(String(error));
}

// Release status is read-only metadata: failures are reported to the renderer
// without mutating the installed DB version or the local anime_data file.
export async function getAnimeDbDownloadReleaseStatus(): Promise<AnimeDbDownloadReleaseStatus> {
	const installedVersion = UserDbFacade.config.getAnimeDbVersion() ?? null;

	try {
		const sourceConfig  = getValidatedAnimeDbReleaseSourceConfig();
		const latestRelease = await resolveLatestAnimeDbRelease(sourceConfig);
		const latestVersion = latestRelease.revisionTag;

		return {
			installedVersion,
			latestVersion,
			updateAvailable: installedVersion !== latestVersion,
		};
	} catch (error) {
		const normalizedError = normalizeRuntimeError(error);
		LoggerUtils.logMainServiceError(
			"anime-db.download.release-status",
			normalizedError,
		);

		return {
			installedVersion,
			latestVersion:   null,
			updateAvailable: false,
			errorMessage:    normalizedError.message,
		};
	}
}
