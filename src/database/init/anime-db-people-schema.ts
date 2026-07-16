import type { Database } from "better-sqlite3";

export function initAnimePeopleSchema(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        -- characters:
        -- AniList character dictionary for media detail enrichment.
        CREATE TABLE IF NOT EXISTS anime_data.characters
        (
            id INTEGER PRIMARY KEY,
            nameFull   TEXT,
            nameNative TEXT,
            imageJson  TEXT,
            role       TEXT
        );

        -- mediaCharacters:
        -- Many-to-many media/character assignment. Hydration queues own refresh,
        -- but rows are catalog data and safe to distribute. Role lives here
        -- because AniList exposes it on the media-character edge, not on the
        -- global character record.
        CREATE TABLE IF NOT EXISTS anime_data.mediaCharacters
        (
            mediaId     INTEGER NOT NULL,
            characterId INTEGER NOT NULL,
            role        TEXT,
            PRIMARY KEY (mediaId, characterId),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId),
            FOREIGN KEY (characterId) REFERENCES characters (id)
        );

        -- mediaCharacterVoiceActors:
        -- Multilingual voice-actor credits for one media/character edge. AniList
        -- may expose multiple actors per language, so language is part of identity
        -- and this table is intentionally one-to-many instead of mediaCharacters columns.
        CREATE TABLE IF NOT EXISTS anime_data.mediaCharacterVoiceActors
        (
            mediaId             INTEGER NOT NULL,
            characterId         INTEGER NOT NULL,
            voiceActorId        INTEGER NOT NULL,
            voiceActorName      TEXT,
            voiceActorLanguage  TEXT    NOT NULL DEFAULT 'Unknown',
            voiceActorImageJson TEXT,
            sortOrder           INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (mediaId, characterId, voiceActorId, voiceActorLanguage),
            FOREIGN KEY (mediaId, characterId) REFERENCES mediaCharacters (mediaId, characterId)
        );

        -- staff:
        -- AniList staff dictionary for media production credits. Staff identity is
        -- global by AniList staff ID; role-specific credits live in mediaStaff.
        CREATE TABLE IF NOT EXISTS anime_data.staff
        (
            staffId                INTEGER PRIMARY KEY,
            nameFull               TEXT,
            nameNative             TEXT,
            alternativeNamesJson   TEXT,
            language               TEXT,
            imageJson              TEXT,
            description            TEXT,
            primaryOccupationsJson TEXT,
            gender                 TEXT,
            dateOfBirthJson        TEXT,
            dateOfDeathJson        TEXT,
            age                    INTEGER,
            yearsActiveJson        TEXT,
            homeTown               TEXT,
            bloodType              TEXT,
            siteUrl                TEXT
        );

        -- mediaStaff:
        -- Production staff credits for one media. AniList exposes staff roles on
        -- the media-staff edge, so the role belongs here rather than staff.
        CREATE TABLE IF NOT EXISTS anime_data.mediaStaff
        (
            mediaId   INTEGER NOT NULL,
            staffId   INTEGER NOT NULL,
            role      TEXT    NOT NULL DEFAULT 'Unknown',
            sortOrder INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (mediaId, staffId, role),
            FOREIGN KEY (mediaId) REFERENCES media (mediaId),
            FOREIGN KEY (staffId) REFERENCES staff (staffId)
        );
	`);
}
