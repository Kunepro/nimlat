import { AnimeDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	type AnimeDbPopulateCursorState,
	createAnimeDbScanCheckpoint,
} from "./populate-anime-db-policy";

export function createEmptyPopulateCursorState(): AnimeDbPopulateCursorState {
	return {
		persistedCompletedPage: 0,
		persistedLastMediaId:   0,
		persistedMediaCount:    0,
	};
}

export function loadAnimeDbPopulateCursorStateSafely(): AnimeDbPopulateCursorState {
	try {
		const checkpoint = AnimeDbFacade.scanState.loadAnimeDbScanCheckpoint();
		if (!checkpoint) {
			return createEmptyPopulateCursorState();
		}

		return {
			persistedCompletedPage: checkpoint.lastCompletedPage,
			persistedLastMediaId:   checkpoint.lastPersistedMediaId,
			persistedMediaCount:    loadPersistedAnimeDbMediaCountSafely(),
		};
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"anime-db.populate.load-scan-checkpoint",
			typeSafeError(error),
		);
		return createEmptyPopulateCursorState();
	}
}

export function saveAnimeDbScanCheckpointSafely(cursor: AnimeDbPopulateCursorState): void {
	try {
		AnimeDbFacade.scanState.saveAnimeDbScanCheckpoint(createAnimeDbScanCheckpoint(
			cursor,
			Date.now(),
		));
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"anime-db.populate.save-scan-checkpoint",
			typeSafeError(error),
			{
				persistedCompletedPage: cursor.persistedCompletedPage,
				persistedLastMediaId:   cursor.persistedLastMediaId,
			},
		);
	}
}

export function clearAnimeDbScanCheckpointSafely(): void {
	try {
		AnimeDbFacade.scanState.clearAnimeDbScanCheckpoint();
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"anime-db.populate.clear-scan-checkpoint",
			typeSafeError(error),
		);
	}
}

export function loadPersistedAnimeDbMediaCountSafely(): number {
	try {
		return AnimeDbFacade.scanState.getAnimeDbUpdateBaseline().mediaCount;
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"anime-db.populate.load-persisted-media-count",
			typeSafeError(error),
		);
		return 0;
	}
}
