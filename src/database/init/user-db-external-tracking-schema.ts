import type { Database } from "better-sqlite3";

export function initUserExternalTrackingSchema(db: Database): void {
	// Watched state is deliberately independent from local-copy integration.
	// It models whether the user has consumed a media/episode anywhere, even
	// when Nimlat has no local file for it.
	// noinspection SqlResolve
	db.exec(`
        -- userMediaWatchStates:
        -- Local-first watched truth for one canonical media. External trackers
        -- can add positive evidence to this table, but cannot retract watched state
        -- learned locally or from another provider. watchedEpisodeCount preserves partial progress
        -- without implying any local-copy integration status.
        CREATE TABLE IF NOT EXISTS userMediaWatchStates
        (
            mediaId              INTEGER PRIMARY KEY,
            isWatched            BOOLEAN NOT NULL DEFAULT 0,
            watchedEpisodeCount  INTEGER NOT NULL DEFAULT 0,
            episodesCount        INTEGER,
            watchedAt            INTEGER,
            updatedAt            INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userEpisodeWatchStates:
        -- Sparse episode-level watched truth. Rows are keyed by canonical episodeId
        -- but also store mediaId for fast media refreshes and progress aggregation. This table
        -- must never be joined to integration status as a proxy for file ownership.
        CREATE TABLE IF NOT EXISTS userEpisodeWatchStates
        (
            episodeId      INTEGER PRIMARY KEY,
            mediaId        INTEGER NOT NULL,
            episodeNumber  INTEGER NOT NULL,
            isWatched      BOOLEAN NOT NULL DEFAULT 0,
            watchedAt      INTEGER,
            updatedAt      INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- externalTrackingAccounts:
        -- One optional connection/activity row per external anime tracker. Import-only
        -- providers use an available row to retain user-visible import timestamps;
        -- connected rows may also carry user-local OAuth configuration and tokens.
        -- publicProfileIdentifier retains the last successfully imported Kitsu
        -- username/user ID so reopening Preferences never requires retyping it.
        -- Provider is the account identity; arbitrary account labels are intentionally
        -- not stored because they do not affect connection, import, or export state.
        -- Nimlat has no public server and stores no client secrets.
        -- Main-process services encrypt token fields with OS safe storage when
        -- available; if no safe credential backend exists, Preferences warns
        -- before plaintext values are saved here.
        CREATE TABLE IF NOT EXISTS externalTrackingAccounts
        (
            provider            TEXT PRIMARY KEY,
            status              TEXT    NOT NULL,
            authKind            TEXT    NOT NULL,
            clientId            TEXT,
            accessToken         TEXT,
            refreshToken        TEXT,
            tokenExpiresAt      INTEGER,
            publicProfileIdentifier TEXT,
            pendingCodeVerifier TEXT,
            pendingState        TEXT,
            pendingRedirectUri  TEXT,
            lastImportedAt      INTEGER,
            lastError           TEXT,
            updatedAt           INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- externalTrackingProviderMediaMappings:
        -- Provider IDs discovered at runtime live in user_data because AnimeDB is
        -- replaceable release data. The cache currently matters for Kitsu, whose
        -- ID may be learned from an import.
        CREATE TABLE IF NOT EXISTS externalTrackingProviderMediaMappings
        (
            provider        TEXT    NOT NULL,
            mediaId         INTEGER NOT NULL,
            providerMediaId TEXT    NOT NULL,
            PRIMARY KEY (provider, mediaId)
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- externalTrackingPendingExports:
        -- Durable dirty set for user-triggered provider exports. One row per
        -- provider/media collapses repeated local toggles onto the latest SQLite
        -- watch state without scheduling background work. revision protects a
        -- newer toggle from acknowledgement of an older in-flight request.
        -- This state belongs in user_data because it records unexported user
        -- changes independently for each locally configured provider account.
        CREATE TABLE IF NOT EXISTS externalTrackingPendingExports
        (
            provider  TEXT    NOT NULL,
            mediaId   INTEGER NOT NULL,
            revision  INTEGER NOT NULL DEFAULT 1,
            changedAt INTEGER NOT NULL,
            PRIMARY KEY (provider, mediaId)
        );
	`);
}
