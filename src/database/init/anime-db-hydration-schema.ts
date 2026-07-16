import type { Database } from "better-sqlite3";

export function initAnimeHydrationSchema(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        -- aniListInsertErrorLogs:
        -- Diagnostics for complete AniList media payloads rejected during scanner
        -- or updater persistence. Kept in anime_data so catalog generation can be
        -- audited before the resulting AnimeDB asset is distributed.
        CREATE TABLE IF NOT EXISTS anime_data.aniListInsertErrorLogs
        (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            idAniList  INTEGER,
            payload    TEXT    NOT NULL,
            errorMsg   TEXT    NOT NULL,
            occurredAt INTEGER NOT NULL,
            status     TEXT    DEFAULT 'new',
            retryCount INTEGER DEFAULT 0
        );

        -- mediaHydrationQueueAniListIngestion:
        -- Legacy V1 queue that fetched a complete AniList payload for an ID-only
        -- relation placeholder selected through the removed discovery workflow.
        -- The full scanner never used this queue: it persists complete media payloads
        -- directly, then queues the secondary hydration tables below. No runtime
        -- producer or consumer remains, but the published AnimeDB V1 schema is frozen.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationQueueAniListIngestion
        (
            mediaId      INTEGER PRIMARY KEY,
            lastTriedAt  INTEGER,
            errorMessage TEXT,
            retryCount   INTEGER          DEFAULT 0,
            status       TEXT             DEFAULT 'pending',
            priority     INTEGER NOT NULL DEFAULT 0,
            requestedAt  INTEGER NOT NULL DEFAULT 0,
            hiddenAt     INTEGER
        );

        -- mediaHydrationQueueCharacters:
        -- Secondary AniList character hydration after the canonical media payload
        -- is stored. mediaId permits one active refresh lifecycle per media;
        -- hiddenAt controls Errored Content visibility, not daemon eligibility.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationQueueCharacters
        (
            mediaId      INTEGER PRIMARY KEY,
            lastTriedAt  INTEGER,
            errorMessage TEXT,
            retryCount   INTEGER DEFAULT 0,
            status       TEXT    DEFAULT 'pending',
            hiddenAt     INTEGER,
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );

        -- mediaHydrationQueueStaff:
        -- Secondary AniList staff hydration after the canonical media payload is
        -- stored. Independent pagination keeps the catalog scan bounded and lets
        -- staff failures retry without fetching or rewriting the media again.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationQueueStaff
        (
            mediaId      INTEGER PRIMARY KEY,
            lastTriedAt  INTEGER,
            errorMessage TEXT,
            retryCount   INTEGER DEFAULT 0,
            status       TEXT    DEFAULT 'pending',
            hiddenAt     INTEGER,
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );

        -- mediaHydrationQueueJikanEpisodes:
        -- Work queue for canonical Jikan episode hydration. Retryable failures
        -- keep their staging checkpoint so retries resume from the last successful
        -- episode page. Thumbnail enrichment is deliberately not stored here:
        -- it has separate pagination/retry state and must not block episode rows.
        -- hiddenAt belongs on this row so error-list visibility is read without joins.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationQueueJikanEpisodes
        (
            mediaId       INTEGER PRIMARY KEY,
            lastTriedAt   INTEGER,
            errorMessage  TEXT,
            failureReason TEXT,
            retryCount    INTEGER DEFAULT 0,
            status        TEXT    DEFAULT 'pending',
            hiddenAt      INTEGER,
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );

        -- mediaHydrationQueueJikanEpisodeThumbnails:
        -- Work queue for Jikan /videos/episodes thumbnail enrichment. This queue
        -- writes directly to finalized episode rows, has its own page cursor, and
        -- waits behind an active episode sync for the same media. This lets errors
        -- retry from the last successful thumbnail page without re-fetching episodes.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationQueueJikanEpisodeThumbnails
        (
            mediaId        INTEGER PRIMARY KEY,
            lastTriedAt    INTEGER,
            errorMessage   TEXT,
            failureReason  TEXT,
            retryCount     INTEGER          DEFAULT 0,
            status         TEXT             DEFAULT 'pending',
            hiddenAt       INTEGER,
            lastPage       INTEGER NOT NULL DEFAULT 0,
            hasNextPage    BOOLEAN NOT NULL DEFAULT 1,
            priority       INTEGER NOT NULL DEFAULT 0,
            requestedAt    INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );

        -- mediaHydrationQueueJikanEpisodesPriority:
        -- Manual-priority overlay for episode hydration. Kept separate from the
        -- queue row so priority can be cleared independently after completion.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationQueueJikanEpisodesPriority
        (
            mediaId     INTEGER PRIMARY KEY,
            priority    INTEGER NOT NULL DEFAULT 1,
            requestedAt INTEGER NOT NULL,
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );

        -- mediaHydrationJikanEpisodesSyncState:
        -- In-progress Jikan episode sync checkpoint. Lets the daemon resume or
        -- finalize a multi-phase episode/synopsis run without losing page progress.
        -- lastVideosPage/hasNextVideosPage are legacy column names retained so
        -- existing pre-release DBs do not need a wipe; they now store synopsis
        -- detail progress by episode number.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationJikanEpisodesSyncState
        (
            mediaId             INTEGER PRIMARY KEY,
            syncRunId           TEXT    NOT NULL,
            phase               TEXT    NOT NULL DEFAULT 'episodes',
            lastEpisodesPage    INTEGER NOT NULL DEFAULT 0,
            hasNextEpisodesPage BOOLEAN NOT NULL DEFAULT 1,
            lastVideosPage      INTEGER NOT NULL DEFAULT 0,
            hasNextVideosPage   BOOLEAN NOT NULL DEFAULT 1,
            startedAt           INTEGER NOT NULL,
            updatedAt           INTEGER NOT NULL,
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );

        -- mediaHydrationJikanEpisodesStaging:
        -- Temporary per-run episode rows staged before final replacement. The
        -- syncRunId key prevents partial or stale runs from corrupting canonical
        -- episodes if a hydration pass fails midway.
        CREATE TABLE IF NOT EXISTS anime_data.mediaHydrationJikanEpisodesStaging
        (
            mediaId       INTEGER NOT NULL,
            syncRunId     TEXT    NOT NULL,
            episodeNumber INTEGER NOT NULL,
            url           TEXT,
            name          TEXT,
            nameJapanese  TEXT,
            nameRomanji   TEXT,
            synopsis      TEXT,
            duration      INTEGER,
            aired         TEXT,
            score         REAL,
            filler        BOOLEAN,
            recap         BOOLEAN,
            thumbnail     TEXT,
            PRIMARY KEY (mediaId, syncRunId, episodeNumber),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );

        -- mediaJikanEpisodesCoverage:
        -- Last successful Jikan /episodes result for a media. This separates
        -- "Jikan returned an empty valid snapshot" from "episodes have never
        -- been hydrated", which cannot be represented by the episodes table
        -- because absence of child rows is otherwise ambiguous.
        CREATE TABLE IF NOT EXISTS anime_data.mediaJikanEpisodesCoverage
        (
            mediaId              INTEGER PRIMARY KEY,
            status               TEXT    NOT NULL,
            providerEpisodeCount INTEGER NOT NULL,
            lastSyncedAt         INTEGER NOT NULL,
            FOREIGN KEY (mediaId) REFERENCES media (mediaId) ON DELETE CASCADE
        );
	`);
}
