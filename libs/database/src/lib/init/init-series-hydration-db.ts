import { Database } from "better-sqlite3";

export function initSeriesHydrationDb(db: Database) {
    db.exec(`PRAGMA anime_data.defer_foreign_keys = ON`);
    
    db.transaction(() => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS series_hydration.seriesIpRelationsQueue
            (
                serieId      INTEGER PRIMARY KEY,
                lastTriedAt  INTEGER,
                errorMessage TEXT,
                retryCount   INTEGER DEFAULT 0,
                status       TEXT    DEFAULT 'pending',
                FOREIGN KEY (serieId) REFERENCES anime_data.series (malId) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS series_hydration.seriesIpCharactersQueue
            (
                serieId      INTEGER PRIMARY KEY,
                lastTriedAt  INTEGER,
                errorMessage TEXT,
                retryCount   INTEGER DEFAULT 0,
                status       TEXT    DEFAULT 'pending',
                FOREIGN KEY (serieId) REFERENCES anime_data.series (malId) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS series_hydration.seriesIpAniListEpisodesQueue
            (
                serieId      INTEGER PRIMARY KEY,
                lastTriedAt  INTEGER,
                errorMessage TEXT,
                retryCount   INTEGER DEFAULT 0,
                status       TEXT    DEFAULT 'pending',
                FOREIGN KEY (serieId) REFERENCES anime_data.series (malId) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS series_hydration.seriesIpJikanEpisodesQueue
            (
                serieId      INTEGER PRIMARY KEY,
                lastTriedAt  INTEGER,
                errorMessage TEXT,
                retryCount   INTEGER DEFAULT 0,
                status       TEXT    DEFAULT 'pending',
                FOREIGN KEY (serieId) REFERENCES anime_data.series (malId) ON DELETE CASCADE
            );
        `);
    });
}
