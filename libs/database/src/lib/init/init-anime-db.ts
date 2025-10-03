import { Database } from "better-sqlite3";

export function initAnimeDb(db: Database) {
  db.exec(`PRAGMA anime_data.defer_foreign_keys = ON`);
  
  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS anime_data.series
      (-- Series
        malId                 INTEGER PRIMARY KEY, -- AniList/Jikan serie ID
        anilistId             INTEGER, -- internal AniList ID
        title                 TEXT,
        titleJapanese         TEXT,
        titleRomanji          TEXT,
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
        trailerJson           TEXT, -- JSON-encoded MediaTrailer
        updatedAt             INTEGER,
        lastUpdatedAt         INTEGER, -- UNIX timestamp of when the anime data was last updated
        coverImageJson        TEXT, -- JSON-encoded MediaCoverImage
        bannerImage           TEXT,
        averageScore          INTEGER,
        meanScore             INTEGER,
        popularity            INTEGER,
        isAdult               BOOLEAN,
        siteUrl               TEXT,
        externalLinksJson     TEXT, -- JSON-encoded [MediaExternalLink]
        nextAiringEpisodeJson TEXT, -- JSON-encoded AiringSchedule
        nextAiringEpisode     INTEGER, -- UNIX timestamp of the next airing episode
        airingScheduleJson    TEXT -- JSON-encoded { nodes: AiringSchedule[] }
      );
      
      -- Episodes
      CREATE TABLE IF NOT EXISTS anime_data.episodes
      (
        serieMalId    INTEGER NOT NULL, -- The related serie ID
        episodeNumber INTEGER NOT NULL, -- Jikan's mal_id is really episode_number
        url           TEXT,
        title         TEXT,
        titleJapanese TEXT,
        titleRomanji  TEXT,
        aired         TEXT,
        score         REAL,
        filler        BOOLEAN,
        recap         BOOLEAN,
        thumbnail     TEXT,
        PRIMARY KEY (serieMalId, episodeNumber),
        FOREIGN KEY (serieMalId) REFERENCES anime_data.series (malId)
      );
      
      -- IP grouping
      CREATE TABLE IF NOT EXISTS anime_data.ips
      (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT NOT NULL,
        description TEXT,
        originMalId INTEGER, -- the AniList parent malId
        imageUrl    TEXT
      );
      
      CREATE TABLE IF NOT EXISTS anime_data.ipSeries
      (
        serieMalId INTEGER NOT NULL,
        ipId       INTEGER NOT NULL,
        isOfficial BOOLEAN DEFAULT 1,
        PRIMARY KEY (serieMalId, ipId),
        FOREIGN KEY (serieMalId) REFERENCES anime_data.series (malId),
        FOREIGN KEY (ipId) REFERENCES anime_data.ips (id)
      );
      
      -- Genres
      CREATE TABLE IF NOT EXISTS anime_data.genres
      (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS anime_data.seriesGenres
      (
        serieMalId INTEGER NOT NULL,
        genreId    INTEGER NOT NULL,
        PRIMARY KEY (serieMalId, genreId),
        FOREIGN KEY (serieMalId) REFERENCES anime_data.series (malId),
        FOREIGN KEY (genreId) REFERENCES anime_data.genres (id)
      );
      
      -- Tags
      CREATE TABLE IF NOT EXISTS anime_data.tags
      (
        id               INTEGER PRIMARY KEY, -- AniList tag ID
        name             TEXT,
        description      TEXT,
        category         TEXT,
        rank             INTEGER,
        isGeneralSpoiler BOOLEAN,
        isMediaSpoiler   BOOLEAN
      );
      CREATE TABLE IF NOT EXISTS anime_data.seriesTags
      (
        serieMalId INTEGER NOT NULL,
        tagId      INTEGER NOT NULL,
        PRIMARY KEY (serieMalId, tagId),
        FOREIGN KEY (serieMalId) REFERENCES anime_data.series (malId),
        FOREIGN KEY (tagId) REFERENCES anime_data.tags (id)
      );
      
      -- Characters
      CREATE TABLE IF NOT EXISTS anime_data.characters
      (
        id         INTEGER PRIMARY KEY, -- character ID (node.id)
        nameFull   TEXT,
        nameNative TEXT,
        imageJson  TEXT,
        role       TEXT
      );
      CREATE TABLE IF NOT EXISTS anime_data.seriesCharacters
      (
        serieMalId  INTEGER NOT NULL,
        characterId INTEGER NOT NULL,
        PRIMARY KEY (serieMalId, characterId),
        FOREIGN KEY (serieMalId) REFERENCES anime_data.series (malId),
        FOREIGN KEY (characterId) REFERENCES anime_data.characters (id)
      );
      
      -- Relation edges table:
      CREATE TABLE IF NOT EXISTS anime_data.seriesRelations
      (
        serieMalId   INTEGER NOT NULL,
        relatedMalId INTEGER NOT NULL,
        relationType TEXT,
        PRIMARY KEY (serieMalId, relatedMalId, relationType),
        FOREIGN KEY (serieMalId) REFERENCES anime_data.series (malId),
        FOREIGN KEY (relatedMalId) REFERENCES anime_data.series (malId)
      );
      
      -- Error Logs for AniList Serie Insertion Failures
      CREATE TABLE IF NOT EXISTS anime_data.aniListInsertErrorLogs
      (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        malId      INTEGER,               -- MAL ID of the serie that failed to insert (can be NULL)
        payload    TEXT    NOT NULL,      -- JSON string of the serie data
        errorMsg   TEXT    NOT NULL,      -- Error message and stack trace
        occurredAt INTEGER NOT NULL,      -- Timestamp when the error occurred
        status     TEXT    DEFAULT 'new', -- Status flag: 'new', 'retried', 'resolved', etc.
        retryCount INTEGER DEFAULT 0      -- Number of retry attempts
      );
      
      
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idxEpsSeriesId ON anime_data.episodes (serieMalId);
      CREATE UNIQUE INDEX IF NOT EXISTS idxIpsOriginMalId ON anime_data.ips (originMalId);
      -- Index for faster querying of error logs
      CREATE INDEX IF NOT EXISTS idxErrorLogsMalId ON anime_data.aniListInsertErrorLogs (malId);
    `);
  });
}
