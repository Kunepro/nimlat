import { createSearchKey } from "@nimlat/functions";
import {
	UserEpisodeOverrideDto,
	UserGroupOverrideDto,
	UserMediaOverrideRowDto,
} from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { resolveOrSeedCanonicalEpisodeIdByLegacyKey } from "../../anime/canonical/canonical-id-resolution";

// noinspection SqlResolve
const STMT_SAVE_USER_IP_OVERRIDE = sql`
    INSERT INTO userGroupOverrides (animeGroupId,
                                    name,
                                    nameSearchKey,
                                    description,
                                    imageUrl,
                                    updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(animeGroupId) DO UPDATE SET name        = excluded.name,
                                            nameSearchKey = excluded.nameSearchKey,
                                            description = excluded.description,
                                            imageUrl    = excluded.imageUrl,
                                            updatedAt   = excluded.updatedAt
`;

// noinspection SqlResolve
const STMT_SAVE_USER_SERIE_OVERRIDE = sql`
    INSERT INTO userMediaOverrides (mediaId,
                                    name,
                                    nameSearchKey,
                                    description,
                                    customImageUrl,
                                    updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(mediaId) DO UPDATE SET name           = excluded.name,
                                       nameSearchKey  = excluded.nameSearchKey,
                                       description    = excluded.description,
                                       customImageUrl = excluded.customImageUrl,
                                       updatedAt      = excluded.updatedAt
`;

// noinspection SqlResolve
const STMT_SAVE_USER_EPISODE_OVERRIDE = sql`
    INSERT INTO userEpisodeOverrides (episodeId,
                                      name,
                                      description,
                                      thumbnail,
                                      aired,
                                      updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(episodeId) DO UPDATE SET name        = excluded.name,
                                         description = excluded.description,
                                         thumbnail   = excluded.thumbnail,
                                         aired       = excluded.aired,
                                         updatedAt   = excluded.updatedAt
`;

// noinspection SqlResolve
const STMT_DELETE_USER_IP_OVERRIDE = sql`
    DELETE
    FROM userGroupOverrides
    WHERE animeGroupId = ?
`;

// noinspection SqlResolve
const STMT_DELETE_USER_SERIE_OVERRIDE = sql`
    DELETE
    FROM userMediaOverrides
    WHERE mediaId = ?
`;

// noinspection SqlResolve
const STMT_DELETE_USER_EPISODE_OVERRIDE = sql`
    DELETE
    FROM userEpisodeOverrides
    WHERE episodeId = ?
`;

// noinspection SqlResolve
const STMT_SELECT_USER_GROUP_OVERRIDE = sql`
    SELECT animeGroupId,
           name,
           description,
           imageUrl,
           updatedAt
    FROM userGroupOverrides
    WHERE animeGroupId = ?
`;

// noinspection SqlResolve
const STMT_SELECT_USER_MEDIA_OVERRIDE = sql`
    SELECT mediaId,
           name,
           description,
           customImageUrl,
           updatedAt
    FROM userMediaOverrides
    WHERE mediaId = ?
`;

// noinspection SqlResolve
const STMT_SELECT_USER_EPISODE_OVERRIDE = sql`
    SELECT name,
           description,
           thumbnail,
           aired,
           updatedAt
    FROM userEpisodeOverrides
    WHERE episodeId = ?
`;

// Persist sparse metadata overrides for anime-owned Group rows.
// The row can exist even while grouping still resolves from anime_data.
// This stays legacy-only for now because the canonical user-group shadow represents
// forked user grouping, not anime-mode Group metadata overlays.
export function saveUserGroupOverride(override: UserGroupOverrideDto): void {
	const db = getDatabase();
	saveUserGroupOverrideInternal(
		db,
		override,
	);
}

// Persist sparse Media metadata overrides without mutating the canonical anime_data row.
export function saveUserMediaOverride(override: UserMediaOverrideRowDto): void {
	saveUserMediaOverrideInternal(
		getDatabase(),
		override,
	);
}

// Persist sparse episode metadata overrides for editable fields such as title or thumbnail.
export function saveUserEpisodeOverride(override: UserEpisodeOverrideDto): void {
	saveUserEpisodeOverrideInternal(
		getDatabase(),
		override,
	);
}

// Remove one sparse Group override row so anime_data becomes visible again in anime mode.
// This intentionally only clears the legacy anime-mode overlay row until a dedicated
// canonical anime-mode Group override bridge exists.
export function deleteUserGroupOverride(animeGroupId: number): void {
	const db = getDatabase();
	deleteUserGroupOverrideInternal(
		db,
		animeGroupId,
	);
}

// Remove one sparse Media override row so canonical anime_data metadata becomes visible again.
export function deleteUserMediaOverride(mediaId: number): void {
	deleteUserMediaOverrideInternal(
		getDatabase(),
		mediaId,
	);
}

// Remove one sparse episode override row so canonical episode metadata becomes visible again.
export function deleteUserEpisodeOverride(mediaId: number, episodeNumber: number): void {
	deleteUserEpisodeOverrideInternal(
		getDatabase(),
		mediaId,
		episodeNumber,
	);
}

// Read one sparse Group override row when a caller needs exact rollback state.
export function selectUserGroupOverride(animeGroupId: number): UserGroupOverrideDto | null {
	return selectUserGroupOverrideInternal(
		getDatabase(),
		animeGroupId,
	);
}

// Read one sparse Media override row when a caller needs exact rollback state.
export function selectUserMediaOverride(mediaId: number): UserMediaOverrideRowDto | null {
	return selectUserMediaOverrideInternal(
		getDatabase(),
		mediaId,
	);
}

// Read one sparse episode override row when a caller needs exact rollback state.
export function selectUserEpisodeOverride(mediaId: number, episodeNumber: number): UserEpisodeOverrideDto | null {
	return selectUserEpisodeOverrideInternal(
		getDatabase(),
		mediaId,
		episodeNumber,
	);
}

function saveUserGroupOverrideInternal(db: Database, override: UserGroupOverrideDto): void {
	db.prepare(STMT_SAVE_USER_IP_OVERRIDE)
		.run(
			override.animeGroupId,
			override.name ?? null,
			override.name == null ? null : createSearchKey(override.name),
			override.description ?? null,
			override.imageUrl ?? null,
			override.updatedAt,
		);
}

function saveUserMediaOverrideInternal(db: Database, override: UserMediaOverrideRowDto): void {
	db.prepare(STMT_SAVE_USER_SERIE_OVERRIDE)
		.run(
			override.mediaId,
			override.name ?? null,
			override.name == null ? null : createSearchKey(override.name),
			override.description ?? null,
			override.customImageUrl ?? null,
			override.updatedAt,
		);
}

function saveUserEpisodeOverrideInternal(db: Database, override: UserEpisodeOverrideDto): void {
	const episodeId = resolveOrSeedCanonicalEpisodeIdByLegacyKey(
		db,
		override.mediaId,
		override.episodeNumber,
	);
	db.prepare(STMT_SAVE_USER_EPISODE_OVERRIDE)
		.run(
			episodeId,
			override.name ?? null,
			override.description ?? null,
			override.thumbnail ?? null,
			override.aired ?? null,
			override.updatedAt,
		);
}

function deleteUserGroupOverrideInternal(db: Database, animeGroupId: number): void {
	db.prepare(STMT_DELETE_USER_IP_OVERRIDE).run(animeGroupId);
}

function deleteUserMediaOverrideInternal(db: Database, mediaId: number): void {
	db.prepare(STMT_DELETE_USER_SERIE_OVERRIDE).run(mediaId);
}

function deleteUserEpisodeOverrideInternal(db: Database, mediaId: number, episodeNumber: number): void {
	const episodeId = resolveOrSeedCanonicalEpisodeIdByLegacyKey(
		db,
		mediaId,
		episodeNumber,
	);
	db.prepare(STMT_DELETE_USER_EPISODE_OVERRIDE)
		.run(episodeId);
}

function selectUserGroupOverrideInternal(db: Database, animeGroupId: number): UserGroupOverrideDto | null {
	return (db.prepare(STMT_SELECT_USER_GROUP_OVERRIDE).get(animeGroupId) as UserGroupOverrideDto | undefined) ?? null;
}

function selectUserMediaOverrideInternal(db: Database, mediaId: number): UserMediaOverrideRowDto | null {
	return (db.prepare(STMT_SELECT_USER_MEDIA_OVERRIDE).get(mediaId) as UserMediaOverrideRowDto | undefined) ?? null;
}

function selectUserEpisodeOverrideInternal(db: Database, mediaId: number, episodeNumber: number): UserEpisodeOverrideDto | null {
	const episodeId = resolveOrSeedCanonicalEpisodeIdByLegacyKey(
		db,
		mediaId,
		episodeNumber,
	);
	const row       = db.prepare(STMT_SELECT_USER_EPISODE_OVERRIDE)
		.get(episodeId) as Omit<UserEpisodeOverrideDto, "mediaId" | "episodeNumber"> | undefined;

	return row
		? {
			mediaId,
			episodeNumber,
			...row,
		}
		: null;
}
