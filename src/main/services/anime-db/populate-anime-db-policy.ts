import { exponentialBackoffSeconds } from "@nimlat/functions";
import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";

export interface AnimeDbScanCheckpoint {
	version: 2;
	// Compatibility/display ordinal for the last committed ID window.
	lastCompletedPage: number;
	// Durable resume cursor: upper AniList ID of the last fully committed window.
	lastPersistedMediaId: number;
	updatedAt: number;
}

export type AnimeDbPopulateCursorState = {
	persistedCompletedPage: number;
	persistedLastMediaId: number;
	persistedMediaCount: number;
};

export const OFFICIAL_ANIME_DB_MIN_TOTAL  = 19395;
export const SCAN_AUTO_RETRY_MAX_ATTEMPTS = 6;
const SCAN_AUTO_RETRY_BASE_SECONDS        = 5;
const SCAN_AUTO_RETRY_MAX_SECONDS         = 120;
export const ANIME_DB_POPULATE_PAGE_SIZE  = 50;

export function createIdlePopulateProgress(): PopulateAnimeDbProgressData {
	return {
		currentPage:             1,
		requestBatch:            0,
		totalPages:              null,
		processedMedias:         0,
		totalMedias:             OFFICIAL_ANIME_DB_MIN_TOTAL,
		totalMediasIsLowerBound: true,
		currentStatus:           "idle",
	};
}

export function createRunningPopulateProgress(cursor: AnimeDbPopulateCursorState): PopulateAnimeDbProgressData {
	return {
		currentPage:             cursor.persistedCompletedPage + 1,
		requestBatch:            0,
		totalPages:              null,
		processedMedias:         cursor.persistedMediaCount,
		totalMedias:             resolvePopulateTotalMediaLowerBound(
			null,
			cursor.persistedMediaCount,
		),
		totalMediasIsLowerBound: true,
		currentStatus:           "running",
		lastProcessedId:         cursor.persistedLastMediaId || undefined,
	};
}

export function applyPersistedCursorToProgress(
	progress: PopulateAnimeDbProgressData,
	cursor: AnimeDbPopulateCursorState,
): PopulateAnimeDbProgressData {
	return {
		...progress,
		currentPage:             Math.max(
			1,
			cursor.persistedCompletedPage + 1,
		),
		requestBatch:            0,
		processedMedias:         cursor.persistedMediaCount,
		totalMedias:             resolvePopulateTotalMediaLowerBound(
			progress.totalMedias,
			cursor.persistedMediaCount,
		),
		totalMediasIsLowerBound: true,
		lastProcessedId:         cursor.persistedLastMediaId || undefined,
	};
}

export function resolvePopulateTotalMediaLowerBound(
	reportedTotal: number | null | undefined,
	processedMedias: number,
): number {
	return Math.max(
		OFFICIAL_ANIME_DB_MIN_TOTAL,
		reportedTotal ?? 0,
		processedMedias,
	);
}

export function createAnimeDbScanCheckpoint(
	cursor: Pick<AnimeDbPopulateCursorState, "persistedCompletedPage" | "persistedLastMediaId">,
	updatedAt: number,
): AnimeDbScanCheckpoint {
	return {
		version:              2,
		lastCompletedPage:    cursor.persistedCompletedPage,
		lastPersistedMediaId: cursor.persistedLastMediaId,
		updatedAt,
	};
}

export function resolveScanAutoRetryDelaySeconds(attempt: number): number {
	return exponentialBackoffSeconds({
		baseSeconds: SCAN_AUTO_RETRY_BASE_SECONDS,
		maxSeconds:  SCAN_AUTO_RETRY_MAX_SECONDS,
		attempt,
	});
}
