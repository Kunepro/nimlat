import type { Database } from "better-sqlite3";

export function initUserReleaseWatchSchema(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        -- userReleaseWatchStates:
        -- Per-media release-watch state used to track upcoming/released catalog
        -- changes for the Release Watch calendar and group timeline.
        CREATE TABLE IF NOT EXISTS userReleaseWatchStates
        (
            mediaId              INTEGER NOT NULL,
            watchDomain          TEXT    NOT NULL,
            state                TEXT    NOT NULL,
            resolvedReleaseAt    INTEGER,
            releaseDatePrecision TEXT    NOT NULL,
            releaseDateSource    TEXT    NOT NULL,
            lastObservedReleaseAt INTEGER,
            lastCatalogRefreshAt INTEGER,
            lastIntegratedAt     INTEGER,
            payloadJson          TEXT,
            updatedAt            INTEGER NOT NULL,
            PRIMARY KEY (mediaId, watchDomain)
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userReleaseWatchInterestMedia:
        -- Materialized release-watch scope. Tracked titles are direct sources;
        -- their non-ignored related titles are derived sources. Release Watch
        -- must update from this table immediately when tracking intent changes,
        -- rather than waiting for a later catalog refresh.
        CREATE TABLE IF NOT EXISTS userReleaseWatchInterestMedia
        (
            mediaId       INTEGER NOT NULL,
            sourceMediaId INTEGER NOT NULL,
            reason        TEXT    NOT NULL,
            updatedAt     INTEGER NOT NULL,
            PRIMARY KEY (mediaId, sourceMediaId, reason)
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userScheduledMediaRefreshes:
        -- Durable release-watch retry schedule. Keeps retry timing in SQLite so
        -- startup can resume missed attempts after app crashes.
        CREATE TABLE IF NOT EXISTS userScheduledMediaRefreshes
        (
            mediaId                      INTEGER NOT NULL,
            releaseWatchReason           TEXT    NOT NULL,
            scheduledReleaseAt           INTEGER NOT NULL,
            nextAttemptAt                INTEGER NOT NULL,
            attemptCount                 INTEGER NOT NULL DEFAULT 0,
            lastAttemptAt                INTEGER,
            lastOutcome                  TEXT,
            lastObservedCatalogStateHash TEXT,
            cooldownUntil                INTEGER,
            updatedAt                    INTEGER NOT NULL,
            PRIMARY KEY (mediaId, releaseWatchReason, scheduledReleaseAt)
        );
	`);
}
