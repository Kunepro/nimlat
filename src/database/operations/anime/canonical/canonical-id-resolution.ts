import {
	EpisodeId,
	GroupLineageId,
	MediaId,
} from "@nimlat/types/nimlat-ids";
import type { Database } from "better-sqlite3";
import {
	seedCanonicalEpisodeId,
	seedCanonicalGroupLineageId,
	seedCanonicalMediaIdFromAniListId,
} from "./canonical-id-seeds";

type MediaIdRow = {
	mediaId: number | null;
};

type AniListMediaIdRow = {
	idAniList: number | null;
};

type EpisodeIdRow = {
	episodeId: number | null;
};

type GroupLineageIdRow = {
	groupLineageId: number | null;
};

// Resolve the canonical media ID for one AniList compatibility ID when the canonical
// row already exists. Callers that need a bridge value during migration should use
// `resolveOrSeedCanonicalMediaIdByAniListId`.
function resolveCanonicalMediaIdByAniListId(db: Database, idAniList: number): MediaId | undefined {
	// noinspection SqlResolve
	const row = db.prepare(`
    SELECT mediaId
    FROM anime_data.media
    WHERE idAniList = ?
	`).get(idAniList) as MediaIdRow | undefined;

	return typeof row?.mediaId === "number"
		? row.mediaId
		: undefined;
}

// Return the canonical media ID for one AniList compatibility ID.
// During the first migration wave this intentionally seeds from the AniList value
// even before the canonical row is fully populated.
export function resolveOrSeedCanonicalMediaIdByAniListId(db: Database, idAniList: number): MediaId {
	return resolveCanonicalMediaIdByAniListId(
		db,
		idAniList,
	) ?? seedCanonicalMediaIdFromAniListId(idAniList);
}

// Resolve the current AniList compatibility ID for a canonical media row when one exists.
// During the first migration wave this usually equals the canonical media id numerically.
function resolveAniListMediaIdByCanonicalMediaId(
	db: Database,
	mediaId: MediaId,
): number | undefined {
	// noinspection SqlResolve
	const row = db.prepare(`
    SELECT idAniList
    FROM anime_data.media
    WHERE mediaId = ?
	`).get(mediaId) as AniListMediaIdRow | undefined;

	return typeof row?.idAniList === "number"
		? row.idAniList
		: undefined;
}

// Return the best current AniList-compatible ID for a canonical media row.
// This falls back to the canonical media id only while first-wave IDs are still seeded
// from AniList values numerically.
export function resolveAniListCompatibleMediaIdByCanonicalMediaId(
	db: Database,
	mediaId: MediaId,
): number {
	return resolveAniListMediaIdByCanonicalMediaId(
		db,
		mediaId,
	) ?? mediaId;
}

// Resolve a canonical episode ID from the legacy `(mediaId, episodeNumber)` pair
// when the episodes row has already been bridged.
function resolveCanonicalEpisodeIdByLegacyKey(
	db: Database,
	mediaId: number,
	episodeNumber: number,
): EpisodeId | undefined {
	// noinspection SqlResolve
	const row = db.prepare(`
    SELECT episodeId
    FROM anime_data.episodes
    WHERE mediaId = ?
      AND episodeNumber = ?
	`).get(
		mediaId,
		episodeNumber,
	) as EpisodeIdRow | undefined;

	return typeof row?.episodeId === "number"
		? row.episodeId
		: undefined;
}

// Resolve a canonical episode ID for a legacy episode key and persist the bridge columns
// onto the episodes row if they have not been populated yet.
export function resolveOrSeedCanonicalEpisodeIdByLegacyKey(
	db: Database,
	legacyMediaId: number,
	episodeNumber: number,
): EpisodeId {
	const existingEpisodeId = resolveCanonicalEpisodeIdByLegacyKey(
		db,
		legacyMediaId,
		episodeNumber,
	);
	if (typeof existingEpisodeId === "number") {
		return existingEpisodeId;
	}

	const canonicalMediaId = resolveOrSeedCanonicalMediaIdByAniListId(
		db,
		legacyMediaId,
	);
	const seededEpisodeId  = seedCanonicalEpisodeId(
		canonicalMediaId,
		episodeNumber,
	);

	// noinspection SqlResolve
	db.prepare(`
      UPDATE anime_data.episodes
      SET mediaId   = COALESCE(mediaId, ?),
          episodeId = COALESCE(episodeId, ?)
      WHERE mediaId = ?
        AND episodeNumber = ?
	`).run(
		canonicalMediaId,
		seededEpisodeId,
		legacyMediaId,
		episodeNumber,
	);

	return seededEpisodeId;
}

// Resolve the current canonical lineage ID for the given base-media business anchor.
// During the first migration wave this usually equals the base media ID numerically.
function resolveCanonicalGroupLineageIdByBaseMediaId(
	db: Database,
	baseMediaId: number,
): GroupLineageId | undefined {
	// noinspection SqlResolve
	const row = db.prepare(`
    SELECT groupLineageId
    FROM anime_data.groupLineages
    WHERE baseMediaId = ?
	`).get(baseMediaId) as GroupLineageIdRow | undefined;

	return typeof row?.groupLineageId === "number"
		? row.groupLineageId
		: undefined;
}

// Ensure one canonical lineage row exists for the given base-media business anchor and
// return its current first-wave canonical lineage ID.
export function ensureCanonicalGroupLineageByBaseMediaId(
	db: Database,
	baseMediaId: number,
): GroupLineageId {
	const existing = resolveCanonicalGroupLineageIdByBaseMediaId(
		db,
		baseMediaId,
	);
	if (typeof existing === "number") {
		return existing;
	}

	const groupLineageId = seedCanonicalGroupLineageId(baseMediaId);
	// noinspection SqlResolve
	db.prepare(`
      INSERT OR IGNORE INTO anime_data.groupLineages (groupLineageId, baseMediaId)
      VALUES (?, ?)
	`).run(
		groupLineageId,
		baseMediaId,
	);

	return groupLineageId;
}
