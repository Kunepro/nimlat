import type { Database } from "better-sqlite3";

export function initAnimeCatalogSchema(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        -- media:
        -- Canonical Anime DB media rows imported from AniList and enriched by
        -- provider mappings. This is admin-generated distributable catalog state;
        -- user overrides, local cache paths, and user review state must live elsewhere.
        -- isStub is generation-only FK state for relations whose own scanner window
        -- has not run yet; a distributable AnimeDB must resolve every such row.
        CREATE TABLE IF NOT EXISTS anime_data.media
        (
            mediaId               INTEGER PRIMARY KEY,
            idAniList             INTEGER UNIQUE,
            idMal                 INTEGER,
            name                  TEXT,
            nameJapanese          TEXT,
            nameRomanji           TEXT,
            nameSearchKey         TEXT    NOT NULL DEFAULT '',
            type                  TEXT,
            format                TEXT,
            status                TEXT,
            description           TEXT,
            startDateYear         INTEGER,
            startDateMonth        INTEGER,
            startDateDay          INTEGER,
            endDateYear           INTEGER,
            endDateMonth          INTEGER,
            endDateDay            INTEGER,
            season                TEXT,
            seasonYear            INTEGER,
            episodesCount         INTEGER,
            countryOfOrigin       TEXT,
            source                TEXT,
            trailerJson           TEXT,
            updatedAt             INTEGER,
            lastUpdatedAt         INTEGER,
            coverImageJson        TEXT,
            bannerImage           TEXT,
            customImageUrl        TEXT,
            averageScore          INTEGER,
            meanScore             INTEGER,
            popularity            INTEGER,
            isAdult               BOOLEAN,
            nextAiringEpisodeJson TEXT,
            nextAiringEpisode     INTEGER,
            airingScheduleJson    TEXT,
            isStub                BOOLEAN NOT NULL DEFAULT 0
        );

        -- episodes:
        -- Canonical per-media episode metadata. Jikan hydration owns these rows;
        -- thumbnails are enrichment fields and must not make episode existence depend
        -- on video-thumbnail availability.
        CREATE TABLE IF NOT EXISTS anime_data.episodes
        (
            episodeId     INTEGER UNIQUE,
            mediaId       INTEGER NOT NULL,
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
            PRIMARY KEY (mediaId, episodeNumber),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId)
        );

        -- groupLineages:
        -- Stable official grouping identity anchored by base media. User grouping
        -- reconciliation depends on this lineage surviving group row regeneration.
        CREATE TABLE IF NOT EXISTS anime_data.groupLineages
        (
            groupLineageId INTEGER PRIMARY KEY,
            baseMediaId    INTEGER NOT NULL UNIQUE,
            FOREIGN KEY (baseMediaId) REFERENCES media (mediaId)
        );

        -- groups:
        -- Official Anime DB grouping rows shown by default in anime mode. These are
        -- replaceable catalog rows; user-created groups and edits live in user_data.
        CREATE TABLE IF NOT EXISTS anime_data.groups
        (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            groupLineageId INTEGER NOT NULL,
            baseMediaId    INTEGER NOT NULL UNIQUE,
            name           TEXT    NOT NULL,
            nameSearchKey  TEXT    NOT NULL DEFAULT '',
            description    TEXT,
            imageUrl       TEXT,
            FOREIGN KEY (groupLineageId) REFERENCES groupLineages (groupLineageId),
            FOREIGN KEY (baseMediaId) REFERENCES media (mediaId)
        );

        -- groupMedia:
        -- Official membership between catalog groups and media. Composite key keeps
        -- membership idempotent during scanner/updater passes.
        CREATE TABLE IF NOT EXISTS anime_data.groupMedia
        (
            groupId    INTEGER NOT NULL,
            mediaId    INTEGER NOT NULL,
            isOfficial BOOLEAN DEFAULT 1,
            PRIMARY KEY (groupId, mediaId),
            FOREIGN KEY (groupId) REFERENCES groups (id),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId)
        );

        -- mediaRelations:
        -- Provider relationship graph between media rows. Used for grouping,
        -- Release Watch scope and lineage repair; relationType is part of identity because
        -- providers may expose multiple relationship classes for the same pair.
        CREATE TABLE IF NOT EXISTS anime_data.mediaRelations
        (
            mediaId        INTEGER NOT NULL,
            relatedMediaId INTEGER NOT NULL,
            relationType   TEXT,
            PRIMARY KEY (mediaId, relatedMediaId, relationType),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId),
            FOREIGN KEY (relatedMediaId) REFERENCES media (mediaId)
        );

        -- mediaProviderMappings:
        -- External provider IDs for one media row. The provider/providerMediaId key
        -- prevents two catalog rows from claiming the same upstream identity.
        CREATE TABLE IF NOT EXISTS anime_data.mediaProviderMappings
        (
            mediaId           INTEGER NOT NULL,
            provider          TEXT    NOT NULL,
            providerMediaId   TEXT    NOT NULL,
            isPrimary         BOOLEAN NOT NULL DEFAULT 1,
            lastVerifiedAt    INTEGER,
            mappingConfidence TEXT,
            PRIMARY KEY (provider, providerMediaId),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId)
        );

        -- episodeProviderMappings:
        -- External provider IDs for episode-level matching. Either a direct provider
        -- episode ID or provider media+episode number is required.
        CREATE TABLE IF NOT EXISTS anime_data.episodeProviderMappings
        (
            episodeId             INTEGER NOT NULL,
            provider              TEXT    NOT NULL,
            providerEpisodeId     TEXT,
            providerMediaId       TEXT,
            providerEpisodeNumber TEXT,
            lastVerifiedAt        INTEGER,
            mappingConfidence     TEXT,
            PRIMARY KEY (provider, providerMediaId, providerEpisodeNumber),
            CHECK (
                providerEpisodeId IS NOT NULL
                    OR (providerMediaId IS NOT NULL AND providerEpisodeNumber IS NOT NULL)
                ),
            FOREIGN KEY (episodeId) REFERENCES episodes (episodeId)
        );

        -- groupLineageProviderMappings:
        -- External grouping keys mapped to stable lineages rather than transient
        -- group rows, so user reconcile can survive official group regeneration.
        CREATE TABLE IF NOT EXISTS anime_data.groupLineageProviderMappings
        (
            groupLineageId    INTEGER NOT NULL,
            provider          TEXT    NOT NULL,
            providerGroupKey  TEXT    NOT NULL,
            mappingType       TEXT    NOT NULL,
            lastVerifiedAt    INTEGER,
            mappingConfidence TEXT,
            PRIMARY KEY (provider, providerGroupKey),
            FOREIGN KEY (groupLineageId) REFERENCES groupLineages (groupLineageId)
        );

        -- genres:
        -- Normalized AniList genre dictionary for catalog filtering/display.
        CREATE TABLE IF NOT EXISTS anime_data.genres
        (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );

        -- mediaGenres:
        -- Many-to-many media/genre assignment. Rows are catalog-owned and rebuilt
        -- from provider metadata.
        CREATE TABLE IF NOT EXISTS anime_data.mediaGenres
        (
            mediaId INTEGER NOT NULL,
            genreId INTEGER NOT NULL,
            PRIMARY KEY (mediaId, genreId),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId),
            FOREIGN KEY (genreId) REFERENCES genres (id)
        );

        -- tags:
        -- AniList tag dictionary, including spoiler flags and rank metadata used for
        -- filtering and detail display.
        CREATE TABLE IF NOT EXISTS anime_data.tags
        (
            id INTEGER PRIMARY KEY,
            name             TEXT,
            description      TEXT,
            category         TEXT,
            rank             INTEGER,
            isGeneralSpoiler BOOLEAN,
            isMediaSpoiler   BOOLEAN
        );

        -- mediaTags:
        -- Many-to-many media/tag assignment. Composite key keeps repeated ingestion
        -- idempotent.
        CREATE TABLE IF NOT EXISTS anime_data.mediaTags
        (
            mediaId INTEGER NOT NULL,
            tagId   INTEGER NOT NULL,
            PRIMARY KEY (mediaId, tagId),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId),
            FOREIGN KEY (tagId) REFERENCES tags (id)
        );

        -- scanState:
        -- Anime DB scanner/updater checkpoints. Admin population uses this to
        -- resume long-running catalog jobs without duplicating completed pages.
        CREATE TABLE IF NOT EXISTS anime_data.scanState
        (
            settingKey   TEXT PRIMARY KEY,
            settingValue TEXT
        );
	`);
}
