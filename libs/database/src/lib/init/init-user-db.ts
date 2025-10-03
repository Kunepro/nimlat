import {
	KEY_USER_DB_ADULT_CONTENT,
	KEY_USER_DB_ANIME_DB_VERSION,
	KEY_USER_DB_DEBUGGING_ENABLED,
	KEY_USER_DB_DEV_MODE,
} from "@nimlat/const/main/database-user-keys";
import { Database } from "better-sqlite3";

export function initUserDb(db: Database) {
	db.exec(`PRAGMA anime_data.defer_foreign_keys = ON`);
	
	db.transaction(() => {
		// Create the key/value table
		db.exec(`
        CREATE TABLE IF NOT EXISTS config
        (
            settingKey   TEXT PRIMARY KEY, -- e.g. 'animeDbVersion', 'isAdultContentEnabled'...
            settingValue TEXT              -- the user’s choice for that key
        );
		`);
		
		// Seed first setting (animeDbVersion) with NULL
		db.exec(`
        INSERT OR IGNORE INTO config (settingKey)
        VALUES ('${ KEY_USER_DB_ANIME_DB_VERSION }');
		`);
		
		// Seed isAdultContentEnabled setting with false by default
		db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_ADULT_CONTENT }', 'false');
		`);
		
		// Seed devMode setting with false by default
		db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_DEV_MODE }', 'false');
		`);
		
		// Seed debuggingEnabled setting with false by default
		db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_DEBUGGING_ENABLED }', 'false');
		`);
	});
}
