import type { Database } from "better-sqlite3";

export function initUserGroupingSchema(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        -- userGroupingState:
        -- Singleton state for anime/user grouping mode and reconcile progress.
        -- id is constrained to 1 so callers never page or create multiple modes.
        CREATE TABLE IF NOT EXISTS userGroupingState
        (
            id                           INTEGER PRIMARY KEY CHECK (id = 1),
            groupingMode                 TEXT NOT NULL DEFAULT 'anime',
            forkedFromAnimeDbVersion     TEXT,
            lastReconciledAnimeDbVersion TEXT,
            lastReconciledAt             INTEGER,
            lastReconcileStatus          TEXT,
            lastReconcileSummaryJson     TEXT
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO userGroupingState (id, groupingMode)
        VALUES (1, 'anime');
	`);

	// Anime-mode metadata overlays stay separate because they apply even before grouping forks.
	// noinspection SqlResolve
	db.exec(`
        -- userGroupOverrides:
        -- Sparse user edits for official anime_data groups. Does not fork grouping;
        -- reads fall back to anime_data when a field is null.
        CREATE TABLE IF NOT EXISTS userGroupOverrides
        (
            animeGroupId INTEGER PRIMARY KEY,
            name         TEXT,
            nameSearchKey TEXT,
            description  TEXT,
            imageUrl     TEXT,
            updatedAt    INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userHiddenOfficialGroups:
        -- User-local suppression for official anime_data groups. Keeps source
        -- catalog rows untouched while hiding them from library/inspection reads.
        CREATE TABLE IF NOT EXISTS userHiddenOfficialGroups
        (
            animeGroupId INTEGER PRIMARY KEY,
            hiddenAt     INTEGER NOT NULL
        );
	`);

	// Final user-owned grouping snapshot.
	// noinspection SqlResolve
	db.exec(`
        -- userGroups:
        -- User-owned grouping rows after fork/custom edits. Official lineages may
        -- be mirrored here, while custom groups use isUserCreated.
        CREATE TABLE IF NOT EXISTS userGroups
        (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            groupLineageId INTEGER,
            baseMediaId    INTEGER,
            name           TEXT    NOT NULL,
            nameSearchKey  TEXT    NOT NULL DEFAULT '',
            description    TEXT,
            imageUrl       TEXT,
            isUserCreated  BOOLEAN NOT NULL DEFAULT 0,
            createdAt      INTEGER NOT NULL,
            updatedAt      INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userGroupMedias:
        -- Membership for user-owned groups. Cascades with userGroups; media rows
        -- remain catalog-owned in anime_data.
        CREATE TABLE IF NOT EXISTS userGroupMedias
        (
            groupId INTEGER NOT NULL,
            mediaId INTEGER NOT NULL,
            PRIMARY KEY (groupId, mediaId),
            FOREIGN KEY (groupId) REFERENCES userGroups (id) ON DELETE CASCADE
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userGroupLineages:
        -- User snapshot of official lineages and reconcile status. Allows upstream
        -- anime_data changes to be classified without losing user decisions.
        CREATE TABLE IF NOT EXISTS userGroupLineages
        (
            groupLineageId          INTEGER PRIMARY KEY,
            userGroupId             INTEGER,
            status                  TEXT NOT NULL,
            firstSeenAnimeDbVersion TEXT,
            lastSeenAnimeDbVersion  TEXT,
            lastAutoImportedAt      INTEGER,
            lastUserModifiedAt      INTEGER,
            FOREIGN KEY (userGroupId) REFERENCES userGroups (id) ON DELETE SET NULL
        );
	`);

	// Final metadata override storage.
	// noinspection SqlResolve
	db.exec(`
        -- userMediaOverrides:
        -- Sparse user edits for anime_data media fields. Null values mean "use
        -- catalog value"; rows exist only for edited media.
        CREATE TABLE IF NOT EXISTS userMediaOverrides
        (
            mediaId        INTEGER PRIMARY KEY,
            name           TEXT,
            nameSearchKey  TEXT,
            description    TEXT,
            customImageUrl TEXT,
            updatedAt      INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userEpisodeOverrides:
        -- Sparse user edits for episode display metadata. Episode identity remains
        -- anime_data-owned; this table only stores local overrides.
        CREATE TABLE IF NOT EXISTS userEpisodeOverrides
        (
            episodeId   INTEGER PRIMARY KEY,
            name        TEXT,
            description TEXT,
            thumbnail   TEXT,
            aired       TEXT,
            updatedAt   INTEGER NOT NULL
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userGroupingReconcileRuns:
        -- Audit trail for reconcile attempts between local user grouping and a new
        -- anime_data version. Stores summary JSON only, not unbounded row payloads.
        CREATE TABLE IF NOT EXISTS userGroupingReconcileRuns
        (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            fromAnimeDbVersion TEXT,
            toAnimeDbVersion   TEXT    NOT NULL,
            startedAt          INTEGER NOT NULL,
            completedAt        INTEGER,
            status             TEXT    NOT NULL,
            summaryJson        TEXT
        );
	`);
	// noinspection SqlResolve
	db.exec(`
        -- userGroupingReconcileConflicts:
        -- Bounded conflict records attached to a reconcile run. Payload JSON stores
        -- the detail needed for UI resolution without mutating anime_data.
        CREATE TABLE IF NOT EXISTS userGroupingReconcileConflicts
        (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            runId            INTEGER NOT NULL,
            conflictType     TEXT    NOT NULL,
            groupLineageId   INTEGER,
            mediaId          INTEGER,
            userGroupId      INTEGER,
            payloadJson      TEXT    NOT NULL,
            resolutionStatus TEXT    NOT NULL DEFAULT 'pending',
            FOREIGN KEY (runId) REFERENCES userGroupingReconcileRuns (id) ON DELETE CASCADE,
            FOREIGN KEY (userGroupId) REFERENCES userGroups (id) ON DELETE SET NULL
        );
	`);
}
