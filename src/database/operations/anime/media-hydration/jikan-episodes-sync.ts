import type { JikanEpisodesSyncStateDto } from "@nimlat/types/anime-db";
import type {
	JikanEpisode,
	JikanEpisodeVideo,
} from "@nimlat/types/jikan-api";
import { getDatabase } from "../../../utils/get-db";
import { resolveOrSeedCanonicalEpisodeIdByLegacyKey } from "../canonical/canonical-id-resolution";
import {
	createInitialJikanEpisodesSyncStateRow,
	createJikanEpisodesSyncRunId,
	type EpisodeStagingWriteRow,
	isJikanEpisodeThumbnailWriteCompatibleWithEpisode,
	type JikanEpisodesSyncStateRow,
	type JikanEpisodeSynopsisCandidate,
	type JikanEpisodeThumbnailTitleMatchRow,
	type JikanEpisodeThumbnailWrite,
	toEpisodesProgressStateRow,
	toJikanEpisodesCoverageStatus,
	toJikanEpisodesSyncStateDto,
	toJikanEpisodeStagingWriteRows,
	toJikanEpisodeThumbnailWrites,
	toSynopsisProgressStateRow,
} from "./jikan-episodes-sync-model";
import {
	STMT_CLEAR_EPISODE_THUMBNAILS,
	STMT_COUNT_STAGING_EPISODES,
	STMT_DELETE_STAGING_BY_MEDIA,
	STMT_DELETE_SYNC_STATE,
	STMT_FINALIZE_DELETE_MISSING,
	STMT_FINALIZE_UPSERT_TO_EPISODES,
	STMT_INSERT_SYNC_STATE,
	STMT_SELECT_EPISODE_NUMBERS_BY_MEDIA,
	STMT_SELECT_EPISODE_THUMBNAIL_MATCH_ROW,
	STMT_SELECT_NEXT_STAGING_SYNOPSIS_CANDIDATE,
	STMT_SELECT_STAGING_EPISODE_THUMBNAIL_MATCH_ROW,
	STMT_SELECT_SYNC_STATE,
	STMT_UPDATE_EPISODE_THUMBNAIL,
	STMT_UPDATE_STAGING_EPISODE_SYNOPSIS,
	STMT_UPDATE_STAGING_THUMBNAIL,
	STMT_UPSERT_JIKAN_EPISODES_COVERAGE,
	STMT_UPSERT_STAGING_EPISODE,
} from "./jikan-episodes-sync-statements";

export type { JikanEpisodeSynopsisCandidate } from "./jikan-episodes-sync-model";

// Return an existing sync state for the Media or create a new one.
// New state also clears any stale staging rows for this Media.
export function getOrCreateJikanEpisodesSyncState(mediaId: number): JikanEpisodesSyncStateDto {
	const db       = getDatabase();
	const existing = db.prepare<number, JikanEpisodesSyncStateRow>(STMT_SELECT_SYNC_STATE).get(mediaId);
	if (existing) {
		return toJikanEpisodesSyncStateDto(existing);
	}

	const now = Date.now();
	const syncRunId    = createJikanEpisodesSyncRunId(
		mediaId,
		now,
	);
	const initialState = createInitialJikanEpisodesSyncStateRow(
		mediaId,
		syncRunId,
		now,
	);

	const insertNewStateTx = db.transaction(() => {
		db.prepare(STMT_DELETE_STAGING_BY_MEDIA).run(mediaId);
		db.prepare<JikanEpisodesSyncStateRow>(STMT_INSERT_SYNC_STATE).run(initialState);
	});
	insertNewStateTx();

	return toJikanEpisodesSyncStateDto(initialState);
}

// Upserts one episodes page into staging for the active sync run.
export function upsertJikanEpisodesStagingPage(
	mediaId: number,
	syncRunId: string,
	episodes: JikanEpisode[],
): number {
	if (episodes.length === 0) {
		return 0;
	}

	const db   = getDatabase();
	const stmt = db.prepare<EpisodeStagingWriteRow>(STMT_UPSERT_STAGING_EPISODE);
	const tx   = db.transaction((rows: EpisodeStagingWriteRow[]) => {
		let writtenRows = 0;
		rows.forEach((row) => {
			stmt.run(row);
			writtenRows += 1;
		});
		return writtenRows;
	});

	const rows = toJikanEpisodeStagingWriteRows(
		mediaId,
		syncRunId,
		episodes,
	);

	return tx(rows);
}

// Applies one videos page to staging thumbnails for already-staged episode rows.
// This remains only for in-flight staging compatibility; normal thumbnail
// enrichment writes to finalized episodes through the dedicated thumbnail queue.
export function applyJikanEpisodeVideoThumbnailsToStagingPage(
	mediaId: number,
	syncRunId: string,
	videos: JikanEpisodeVideo[],
): number {
	if (videos.length === 0) {
		return 0;
	}

	const db   = getDatabase();
	const stmt = db.prepare(STMT_UPDATE_STAGING_THUMBNAIL);
	const matchStmt = db.prepare<[
		number,
		string,
		number,
	], JikanEpisodeThumbnailTitleMatchRow>(STMT_SELECT_STAGING_EPISODE_THUMBNAIL_MATCH_ROW);
	const tx = db.transaction((input: JikanEpisodeThumbnailWrite[]) => {
		let updatedRows = 0;
		input.forEach((write) => {
			const episodeNumber = write.episodeNumber;
			const thumbnail     = write.thumbnail;
			const episode       = matchStmt.get(
				mediaId,
				syncRunId,
				episodeNumber,
			) ?? null;
			if (!isJikanEpisodeThumbnailWriteCompatibleWithEpisode(
				write,
				episode,
			)) {
				return;
			}

			updatedRows += stmt.run(
				thumbnail,
				mediaId,
				syncRunId,
				episodeNumber,
			).changes;
		});
		return updatedRows;
	});

	return tx(toJikanEpisodeThumbnailWrites(videos));
}

// Selects the next staged episode whose detail endpoint still needs to be attempted.
// Progress is episode-number based because Jikan detail calls are one request per episode.
export function getNextJikanEpisodeSynopsisCandidate(
	mediaId: number,
	syncRunId: string,
	lastSynopsisEpisodeNumber: number,
): JikanEpisodeSynopsisCandidate | null {
	const db = getDatabase();
	return db.prepare<[
		number,
		string,
		number,
	], JikanEpisodeSynopsisCandidate>(STMT_SELECT_NEXT_STAGING_SYNOPSIS_CANDIDATE).get(
		mediaId,
		syncRunId,
		lastSynopsisEpisodeNumber,
	) ?? null;
}

// Writes the result of one Jikan detail request into staging before synopsis progress advances.
export function applyJikanEpisodeSynopsisToStagingEpisode(
	mediaId: number,
	syncRunId: string,
	episodeNumber: number,
	details: Pick<JikanEpisode, "duration" | "synopsis">,
): number {
	const db = getDatabase();
	return db.prepare(STMT_UPDATE_STAGING_EPISODE_SYNOPSIS).run(
		details.synopsis ?? null,
		details.duration ?? null,
		mediaId,
		syncRunId,
		episodeNumber,
	).changes;
}

// Thumbnail enrichment is intentionally separated from episode fetching. It writes
// only to finalized episode rows and advances through its own resumable queue.
export function applyJikanEpisodeVideoThumbnailsToEpisodesPage(
	mediaId: number,
	videos: JikanEpisodeVideo[],
): number {
	if (videos.length === 0) {
		return 0;
	}

	const db   = getDatabase();
	const stmt = db.prepare(STMT_UPDATE_EPISODE_THUMBNAIL);
	const matchStmt = db.prepare<[
		number,
		number,
	], JikanEpisodeThumbnailTitleMatchRow>(STMT_SELECT_EPISODE_THUMBNAIL_MATCH_ROW);
	const tx = db.transaction((input: JikanEpisodeThumbnailWrite[]) => {
		let updatedRows = 0;
		input.forEach((write) => {
			const episodeNumber = write.episodeNumber;
			const thumbnail     = write.thumbnail;
			const episode       = matchStmt.get(
				mediaId,
				episodeNumber,
			) ?? null;
			if (!isJikanEpisodeThumbnailWriteCompatibleWithEpisode(
				write,
				episode,
			)) {
				return;
			}

			updatedRows += stmt.run(
				thumbnail,
				mediaId,
				episodeNumber,
			).changes;
		});
		return updatedRows;
	});

	return tx(toJikanEpisodeThumbnailWrites(videos));
}

// Full thumbnail refreshes clear previous provider thumbnails first. This keeps
// earlier ambiguous video-id writes from surviving when the current pass skips
// unsafe Jikan episode-video rows.
export function clearJikanEpisodeThumbnailsForMedia(mediaId: number): number {
	const db = getDatabase();
	return db.prepare(STMT_CLEAR_EPISODE_THUMBNAILS).run(mediaId).changes;
}

// Persists page progress for episodes phase.
export function updateJikanEpisodesSyncEpisodesProgress(
	mediaId: number,
	lastEpisodesPage: number,
	hasNextEpisodesPage: boolean,
): void {
	const db    = getDatabase();
	const state = db.prepare<number, JikanEpisodesSyncStateRow>(STMT_SELECT_SYNC_STATE).get(mediaId);
	if (!state) {
		return;
	}

	db.prepare<JikanEpisodesSyncStateRow>(STMT_INSERT_SYNC_STATE).run(toEpisodesProgressStateRow(
		state,
		lastEpisodesPage,
		hasNextEpisodesPage,
		Date.now(),
	));
}

// Persists per-episode progress for the synopsis detail phase.
export function updateJikanEpisodesSyncSynopsisProgress(
	mediaId: number,
	lastSynopsisEpisodeNumber: number,
	hasNextSynopsisEpisode: boolean,
): void {
	const db    = getDatabase();
	const state = db.prepare<number, JikanEpisodesSyncStateRow>(STMT_SELECT_SYNC_STATE).get(mediaId);
	if (!state) {
		return;
	}

	db.prepare<JikanEpisodesSyncStateRow>(STMT_INSERT_SYNC_STATE).run(toSynopsisProgressStateRow(
		state,
		lastSynopsisEpisodeNumber,
		hasNextSynopsisEpisode,
		Date.now(),
	));
}

// Finalizes one sync run:
// - upserts staging rows into main episodes
// - deletes rows missing from the staging snapshot
// - clears sync state + staging
export function finalizeJikanEpisodesSync(
	mediaId: number,
	syncRunId: string,
): { writtenRows: number; deletedRows: number } {
	const db = getDatabase();
	const tx = db.transaction(() => {
		const stagedEpisodeCount = db.prepare<
			[
				number,
				string,
			],
			{ count: number }
		>(STMT_COUNT_STAGING_EPISODES).get(
			mediaId,
			syncRunId,
		)?.count ?? 0;
		const writtenRows        = db.prepare(STMT_FINALIZE_UPSERT_TO_EPISODES).run(
			mediaId,
			syncRunId,
		).changes;
		const deletedRows    = db.prepare(STMT_FINALIZE_DELETE_MISSING).run(
			mediaId,
			mediaId,
			syncRunId,
		).changes;
		const episodeNumbers = db.prepare<number, { episodeNumber: number }>(STMT_SELECT_EPISODE_NUMBERS_BY_MEDIA)
			.all(mediaId);
		episodeNumbers.forEach((row) => {
			resolveOrSeedCanonicalEpisodeIdByLegacyKey(
				db,
				mediaId,
				row.episodeNumber,
			);
		});
		// Store the provider snapshot outcome at media level: an empty successful
		// Jikan response is meaningful even though it writes no episode rows.
		const coverageStatus = toJikanEpisodesCoverageStatus(stagedEpisodeCount);
		db.prepare(STMT_UPSERT_JIKAN_EPISODES_COVERAGE).run(
			mediaId,
			coverageStatus,
			stagedEpisodeCount,
			Date.now(),
		);

		db.prepare(STMT_DELETE_STAGING_BY_MEDIA).run(mediaId);
		db.prepare(STMT_DELETE_SYNC_STATE).run(mediaId);

		return {
			writtenRows,
			deletedRows,
		};
	});

	return tx();
}

// Clear in-flight staging/sync metadata for a Media.
export function clearJikanEpisodesSyncState(mediaId: number): void {
	const db = getDatabase();
	const tx = db.transaction(() => {
		db.prepare(STMT_DELETE_STAGING_BY_MEDIA).run(mediaId);
		db.prepare(STMT_DELETE_SYNC_STATE).run(mediaId);
	});
	tx();
}
