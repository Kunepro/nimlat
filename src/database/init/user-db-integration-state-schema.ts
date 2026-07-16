import type { Database } from "better-sqlite3";

export function initUserIntegrationStateSchema(db: Database): void {
	// Final integration and playback-issue state storage.
	// noinspection SqlResolve
	db.exec(`
        -- userEpisodeStates:
        -- User tracking state for one episode: integration status plus current
        -- playback issue flags. Updated synchronously by main-process services.
        CREATE TABLE IF NOT EXISTS userEpisodeStates
        (
            episodeId         INTEGER PRIMARY KEY,
            integrationStatus TEXT,
            playbackIssueNote TEXT,
            hasDubIssue       BOOLEAN NOT NULL DEFAULT 0,
            hasSubIssue       BOOLEAN NOT NULL DEFAULT 0,
            hasEncodingIssue  BOOLEAN NOT NULL DEFAULT 0,
            hasAudioIssue     BOOLEAN NOT NULL DEFAULT 0,
            hasVideoIssue     BOOLEAN NOT NULL DEFAULT 0,
            updatedAt         INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userEpisodeIntegrationSnapshots:
        -- Cached derived integration percent per episode. Stored so renderer reads
        -- do not recalculate aggregate state on every list render.
        CREATE TABLE IF NOT EXISTS userEpisodeIntegrationSnapshots
        (
            episodeId          INTEGER PRIMARY KEY,
            integrationPercent INTEGER,
            updatedAt          INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userEpisodePlaybackIssueMoments:
        -- Timestamped playback issue notes for episodes. Composite key allows one
        -- note per category/time pair without duplicate markers.
        CREATE TABLE IF NOT EXISTS userEpisodePlaybackIssueMoments
        (
            episodeId             INTEGER NOT NULL,
            playbackIssueCategory TEXT    NOT NULL,
            timeSeconds           INTEGER NOT NULL,
            note                  TEXT,
            updatedAt             INTEGER NOT NULL,
            PRIMARY KEY (episodeId, playbackIssueCategory, timeSeconds)
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userMediaStates:
        -- User tracking state for whole-media progress and issue flags. Complements
        -- episode-level state for films and media-level workflows.
        CREATE TABLE IF NOT EXISTS userMediaStates
        (
            mediaId           INTEGER PRIMARY KEY,
            integrationStatus TEXT,
            playbackIssueNote TEXT,
            hasDubIssue       BOOLEAN NOT NULL DEFAULT 0,
            hasSubIssue       BOOLEAN NOT NULL DEFAULT 0,
            hasEncodingIssue  BOOLEAN NOT NULL DEFAULT 0,
            hasAudioIssue     BOOLEAN NOT NULL DEFAULT 0,
            hasVideoIssue     BOOLEAN NOT NULL DEFAULT 0,
            updatedAt         INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userMediaIntegrationSnapshots:
        -- Cached derived integration percent per media for library/card reads.
        CREATE TABLE IF NOT EXISTS userMediaIntegrationSnapshots
        (
            mediaId            INTEGER PRIMARY KEY,
            integrationPercent INTEGER,
            updatedAt          INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userMediaPlaybackIssueMoments:
        -- Timestamped playback issue notes scoped to a whole media item.
        CREATE TABLE IF NOT EXISTS userMediaPlaybackIssueMoments
        (
            mediaId               INTEGER NOT NULL,
            playbackIssueCategory TEXT    NOT NULL,
            timeSeconds           INTEGER NOT NULL,
            note                  TEXT,
            updatedAt             INTEGER NOT NULL,
            PRIMARY KEY (mediaId, playbackIssueCategory, timeSeconds)
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userGroupStates:
        -- User tracking state keyed by official group lineage. Applies while using
        -- anime-mode grouping and survives official group row regeneration.
        CREATE TABLE IF NOT EXISTS userGroupStates
        (
            groupLineageId    INTEGER PRIMARY KEY,
            integrationStatus TEXT,
            updatedAt         INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userGroupIntegrationSnapshots:
        -- Cached derived integration percent for official lineages.
        CREATE TABLE IF NOT EXISTS userGroupIntegrationSnapshots
        (
            groupLineageId     INTEGER PRIMARY KEY,
            integrationPercent INTEGER,
            updatedAt          INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userAnimeGroupStates:
        -- User tracking state keyed by concrete official anime_data group id for
        -- reads that still operate on group rows rather than lineages.
        CREATE TABLE IF NOT EXISTS userAnimeGroupStates
        (
            animeGroupId      INTEGER PRIMARY KEY,
            integrationStatus TEXT,
            updatedAt         INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userAnimeGroupIntegrationSnapshots:
        -- Cached derived integration percent for concrete official group rows.
        CREATE TABLE IF NOT EXISTS userAnimeGroupIntegrationSnapshots
        (
            animeGroupId       INTEGER PRIMARY KEY,
            integrationPercent INTEGER,
            updatedAt          INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userCustomGroupStates:
        -- User tracking state for custom userGroups. Cascades when a custom group
        -- is deleted.
        CREATE TABLE IF NOT EXISTS userCustomGroupStates
        (
            userGroupId       INTEGER PRIMARY KEY,
            integrationStatus TEXT,
            updatedAt         INTEGER NOT NULL,
            FOREIGN KEY (userGroupId) REFERENCES userGroups (id) ON DELETE CASCADE
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userCustomGroupIntegrationSnapshots:
        -- Cached derived integration percent for custom userGroups.
        CREATE TABLE IF NOT EXISTS userCustomGroupIntegrationSnapshots
        (
            userGroupId        INTEGER PRIMARY KEY,
            integrationPercent INTEGER,
            updatedAt          INTEGER NOT NULL,
            FOREIGN KEY (userGroupId) REFERENCES userGroups (id) ON DELETE CASCADE
        );
	`);
}
