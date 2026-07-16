import {
	KEY_USER_DB_ADMIN_MODE,
	KEY_USER_DB_ADULT_CONTENT,
	KEY_USER_DB_ANIME_DB_VERSION,
	KEY_USER_DB_BACKGROUND_STYLE,
	KEY_USER_DB_CANVAS_DIAGNOSTICS_ENABLED,
	KEY_USER_DB_DEBUGGING_ENABLED,
	KEY_USER_DB_DEV_MODE,
	KEY_USER_DB_LAST_ROUTE,
	KEY_USER_DB_PREFERRED_TITLE_LANGUAGE,
	KEY_USER_DB_WINDOW_BOUNDS,
} from "@nimlat/constants/main/database-user-keys";
import {
	DEFAULT_BACKGROUND_STYLE,
	DEFAULT_PREFERRED_TITLE_LANGUAGE,
} from "@nimlat/types/user-config";
import type { Database } from "better-sqlite3";

export function initUserConfigSchema(db: Database): void {
	// noinspection SqlResolve
	db.exec(`
        -- config:
        -- Single-row-per-setting user/app configuration. Values are strings so
        -- feature services own parsing and defaults.
        CREATE TABLE IF NOT EXISTS config
        (
            settingKey   TEXT PRIMARY KEY,
            settingValue TEXT
        );
	`);

	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey)
        VALUES ('${ KEY_USER_DB_ANIME_DB_VERSION }');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_ADULT_CONTENT }', 'false');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_BACKGROUND_STYLE }', '${ DEFAULT_BACKGROUND_STYLE }');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_PREFERRED_TITLE_LANGUAGE }', '${ DEFAULT_PREFERRED_TITLE_LANGUAGE }');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_DEV_MODE }', 'false');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_ADMIN_MODE }', 'false');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_DEBUGGING_ENABLED }', 'false');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey, settingValue)
        VALUES ('${ KEY_USER_DB_CANVAS_DIAGNOSTICS_ENABLED }', 'false');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey)
        VALUES ('${ KEY_USER_DB_WINDOW_BOUNDS }');
	`);
	// noinspection SqlResolve
	db.exec(`
        INSERT OR IGNORE INTO config (settingKey)
        VALUES ('${ KEY_USER_DB_LAST_ROUTE }');
	`);
}
