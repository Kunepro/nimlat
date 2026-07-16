import type {
	ExternalTrackingEpisodeState,
	ExternalTrackingImportedMedia,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import { Database } from "better-sqlite3";

interface MatchedMediaRow {
	mediaId: number;
	episodesCount: number | null;
}

export interface MediaWatchMetadataRow {
	mediaId: number;
	episodesCount: number | null;
	hydratedEpisodesCount: number;
}

export interface MediaWatchStateRow {
	mediaId: number;
	isWatched: number;
	watchedEpisodeCount: number;
	episodesCount: number | null;
	watchedAt: number | null;
}

export interface EpisodeWatchStateRow {
	episodeId: number;
	episodeNumber: number;
	isWatched: number;
}

export interface MergeMediaWatchStateFromImportRequest {
	db: Database;
	episodeStates: ExternalTrackingEpisodeState[];
	episodesCount: number | null;
	isWatched: boolean;
	mediaId: number;
	now: number;
	progress: number;
	watchedAt: number | null;
}

export function toBooleanFlag(value: boolean): 0 | 1 {
	return value ? 1 : 0;
}

export function fromBooleanFlag(value: number | null | undefined): boolean {
	return value === 1;
}

export function normalizeProgress(value: number | null | undefined): number {
	return Number.isFinite(value) && typeof value === "number" && value > 0
		? Math.floor(value)
		: 0;
}

function resolveWatchedFlag(exactWatchedEpisodeCount: number, isWatched: boolean, knownEpisodesCount: number | null): boolean {
	if (isWatched) {
		return true;
	}

	return typeof knownEpisodesCount === "number"
		&& knownEpisodesCount > 0
		&& exactWatchedEpisodeCount >= knownEpisodesCount;
}

// Aggregate progress is usable only for a completed title. Partial progress
// comes exclusively from explicit episode identities supplied separately.
export function resolveImportedWatchProgress(
	reportedProgress: number | null | undefined,
	isWatched: boolean,
	knownEpisodesCount: number | null,
	exactWatchedEpisodeCount: number = 0,
): number {
	const progress = normalizeProgress(reportedProgress);
	const total    = normalizeProgress(knownEpisodesCount);
	if (!isWatched) return normalizeProgress(exactWatchedEpisodeCount);
	return total > 0 ? total : progress;
}

export function selectMediaMatch(db: Database, provider: ExternalTrackingProvider, item: ExternalTrackingImportedMedia): MatchedMediaRow | null {
	const row = db.prepare(`
		SELECT media.mediaId,
		       media.episodesCount
		FROM anime_data.media media
		WHERE (? IS NOT NULL AND media.idAniList = ?)
		   OR (? IS NOT NULL AND media.idMal = ?)
		   OR EXISTS (
		       SELECT 1
		       FROM anime_data.mediaProviderMappings mappings
		       WHERE mappings.mediaId = media.mediaId
		         AND (
		             (mappings.provider = ? AND mappings.providerMediaId = ?)
		          OR (? IS NOT NULL AND mappings.provider = 'anilist' AND mappings.providerMediaId = ?)
		          OR (? IS NOT NULL AND mappings.provider = 'mal' AND mappings.providerMediaId = ?)
		          OR (? IS NOT NULL AND mappings.provider = 'simkl' AND mappings.providerMediaId = ?)
		          OR (? IS NOT NULL AND mappings.provider = 'kitsu' AND mappings.providerMediaId = ?)
		         )
		   )
		ORDER BY media.isStub ASC, media.mediaId ASC
		LIMIT 1
	`).get(
		item.idAniList ?? null,
		item.idAniList ?? null,
		item.idMal ?? null,
		item.idMal ?? null,
		provider,
		item.providerMediaId ?? null,
		item.idAniList ?? null,
		item.idAniList?.toString() ?? null,
		item.idMal ?? null,
		item.idMal?.toString() ?? null,
		item.idSimkl ?? null,
		item.idSimkl ?? null,
		item.idKitsu ?? null,
		item.idKitsu ?? null,
	) as MatchedMediaRow | undefined;

	return row ?? null;
}

export function selectMediaWatchState(db: Database, mediaId: number): MediaWatchStateRow | null {
	const row = db.prepare(`
		SELECT mediaId,
		       isWatched,
		       watchedEpisodeCount,
		       episodesCount,
		       watchedAt
		FROM userMediaWatchStates
		WHERE mediaId = ?
	`).get(mediaId) as MediaWatchStateRow | undefined;

	return row ?? null;
}

export function selectMediaWatchMetadata(db: Database, mediaId: number): MediaWatchMetadataRow | null {
	const row = db.prepare(`
		SELECT media.mediaId,
		       media.episodesCount,
		       COUNT(episodes.episodeId) AS hydratedEpisodesCount
		FROM anime_data.media media
		     LEFT JOIN anime_data.episodes episodes
		               ON episodes.mediaId = media.mediaId
		WHERE media.mediaId = ?
		GROUP BY media.mediaId,
		         media.episodesCount
	`).get(mediaId) as MediaWatchMetadataRow | undefined;

	return row ?? null;
}

export function selectEpisodeWatchStateRows(db: Database, mediaId: number): EpisodeWatchStateRow[] {
	return db.prepare(`
		SELECT episodes.episodeId,
		       episodes.episodeNumber,
		       COALESCE(userEpisodeWatchStates.isWatched, 0) AS isWatched
		FROM anime_data.episodes episodes
		     LEFT JOIN userEpisodeWatchStates
		               ON userEpisodeWatchStates.episodeId = episodes.episodeId
		WHERE episodes.mediaId = ?
		  AND episodes.episodeNumber >= 1
		ORDER BY episodes.episodeNumber ASC
	`).all(mediaId) as EpisodeWatchStateRow[];
}

export function selectEpisodeWatchStateRow(db: Database, mediaId: number, episodeNumber: number): EpisodeWatchStateRow | null {
	const row = db.prepare(`
		SELECT episodes.episodeId,
		       episodes.episodeNumber,
		       COALESCE(userEpisodeWatchStates.isWatched, 0) AS isWatched
		FROM anime_data.episodes episodes
		     LEFT JOIN userEpisodeWatchStates
		               ON userEpisodeWatchStates.episodeId = episodes.episodeId
		WHERE episodes.mediaId = ?
		  AND episodes.episodeNumber = ?
	`).get(
		mediaId,
		episodeNumber,
	) as EpisodeWatchStateRow | undefined;

	return row ?? null;
}

export function countWatchedEpisodes(rows: EpisodeWatchStateRow[]): number {
	return rows.filter(row => fromBooleanFlag(row.isWatched)).length;
}

export function resolveManualWatchedEpisodeCount(
	metadata: MediaWatchMetadataRow,
	current: MediaWatchStateRow | null,
	isWatched: boolean,
): number {
	if (!isWatched) {
		return 0;
	}

	return Math.max(
		1,
		normalizeProgress(current?.watchedEpisodeCount),
		normalizeProgress(metadata.episodesCount),
		normalizeProgress(metadata.hydratedEpisodesCount),
	);
}

// Provider imports contribute positive watched evidence to the local union. A
// missing/lower provider state cannot retract evidence recorded locally or by
// another provider; only an explicit local mutation owns the unwatch path.
export function mergeMediaWatchStateFromImport({
																								 db,
																								 episodeStates,
																								 episodesCount,
																								 isWatched,
																								 mediaId,
																								 now,
																								 progress,
																								 watchedAt,
																							 }: MergeMediaWatchStateFromImportRequest): {
	changed: boolean;
	isWatched: boolean;
	changedEpisodeStates: ExternalTrackingEpisodeState[];
} {
	const current               = selectMediaWatchState(
		db,
		mediaId,
	);
	const currentCount   = normalizeProgress(current?.watchedEpisodeCount);
	const currentWatched        = fromBooleanFlag(current?.isWatched);
	const positiveEpisodeStates = Array.from(new Map(episodeStates
		.filter(state => state.isWatched && Number.isInteger(state.episodeNumber) && state.episodeNumber > 0)
		.map(state => [
			state.episodeNumber,
			state,
		])).values());
	if (!isWatched && positiveEpisodeStates.length === 0) {
		return {
			changed:              false,
			isWatched:            currentWatched,
			changedEpisodeStates: [],
		};
	}

	const beforeEpisodeRows = selectEpisodeWatchStateRows(
		db,
		mediaId,
	);
	if (isWatched) {
		// Completed is genuine all-or-none evidence, so every catalog episode can
		// be marked without converting an aggregate count into episode identities.
		db.prepare(`
        INSERT INTO userEpisodeWatchStates (episodeId,
                                            mediaId,
                                            episodeNumber,
                                            isWatched,
                                            watchedAt,
                                            updatedAt)
        SELECT episodeId,
               mediaId,
               episodeNumber,
               1,
               ?,
               ?
        FROM anime_data.episodes
        WHERE mediaId = ?
        ON CONFLICT(episodeId) DO UPDATE SET isWatched = 1,
                                             watchedAt = COALESCE(userEpisodeWatchStates.watchedAt, excluded.watchedAt),
                                             updatedAt = excluded.updatedAt
        WHERE userEpisodeWatchStates.isWatched <> 1
		`).run(
			watchedAt ?? now,
			now,
			mediaId,
		);
	} else {
		const markExactEpisodeWatched = db.prepare(`
        INSERT INTO userEpisodeWatchStates (episodeId,
                                            mediaId,
                                            episodeNumber,
                                            isWatched,
                                            watchedAt,
                                            updatedAt)
        SELECT episodeId,
               mediaId,
               episodeNumber,
               1,
               ?,
               ?
        FROM anime_data.episodes
        WHERE mediaId = ?
          AND episodeNumber = ?
        ON CONFLICT(episodeId) DO UPDATE SET isWatched = 1,
                                             watchedAt = COALESCE(userEpisodeWatchStates.watchedAt, excluded.watchedAt),
                                             updatedAt = excluded.updatedAt
        WHERE userEpisodeWatchStates.isWatched <> 1
		`);
		for (const state of positiveEpisodeStates) {
			markExactEpisodeWatched.run(
				state.watchedAt ?? watchedAt ?? now,
				now,
				mediaId,
				state.episodeNumber,
			);
		}
	}

	const afterEpisodeRows         = selectEpisodeWatchStateRows(
		db,
		mediaId,
	);
	const beforeWatchedByEpisode   = new Map(beforeEpisodeRows.map(row => [
		row.episodeNumber,
		fromBooleanFlag(row.isWatched),
	]));
	const changedEpisodeStates     = afterEpisodeRows
		.filter(row => fromBooleanFlag(row.isWatched) && beforeWatchedByEpisode.get(row.episodeNumber) !== true)
		.map(row => ({
			episodeNumber: row.episodeNumber,
			isWatched:     true,
		}));
	const exactWatchedEpisodeCount = countWatchedEpisodes(afterEpisodeRows);
	if (!isWatched && exactWatchedEpisodeCount === 0) {
		// Provider episode numbers that do not exist in AnimeDB are not shared
		// identities. Do not turn them into either progress or an empty local state.
		return {
			changed:              false,
			isWatched:            currentWatched,
			changedEpisodeStates: [],
		};
	}
	const knownEpisodeCounts  = [
		normalizeProgress(current?.episodesCount),
		normalizeProgress(episodesCount),
	].filter(count => count > 0);
	const targetEpisodesCount = knownEpisodeCounts.length > 0 ? Math.max(...knownEpisodeCounts) : null;
	const importedWatched     = resolveWatchedFlag(
		exactWatchedEpisodeCount,
		isWatched,
		targetEpisodesCount,
	);
	const targetWatched       = currentWatched || importedWatched;
	const targetProgress      = targetWatched
		? targetEpisodesCount ?? Math.max(
		normalizeProgress(current?.watchedEpisodeCount),
		normalizeProgress(progress),
		exactWatchedEpisodeCount,
	)
		: exactWatchedEpisodeCount;
	const targetWatchedAt     = targetWatched
		? current?.watchedAt ?? watchedAt ?? now
		: null;
	const mediaChanged        = !current
		|| currentCount !== targetProgress
		|| fromBooleanFlag(current.isWatched) !== targetWatched
		|| current.episodesCount !== targetEpisodesCount
		|| current.watchedAt !== targetWatchedAt;

	if (mediaChanged) {
		db.prepare(`
        INSERT INTO userMediaWatchStates (mediaId,
                                          isWatched,
                                          watchedEpisodeCount,
                                          episodesCount,
                                          watchedAt,
                                          updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(mediaId) DO UPDATE SET isWatched           = excluded.isWatched,
                                           watchedEpisodeCount = excluded.watchedEpisodeCount,
                                           episodesCount       = excluded.episodesCount,
                                           watchedAt           = excluded.watchedAt,
                                           updatedAt           = excluded.updatedAt
		`).run(
			mediaId,
			toBooleanFlag(targetWatched),
			targetProgress,
			targetEpisodesCount,
			targetWatchedAt,
			now,
		);
	}

	return {
		changed:   mediaChanged || changedEpisodeStates.length > 0,
		isWatched: targetWatched,
		changedEpisodeStates,
	};
}
