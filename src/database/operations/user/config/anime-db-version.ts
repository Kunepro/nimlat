import { KEY_USER_DB_ANIME_DB_VERSION } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";


interface StringSettingValue {settingValue: string | null | undefined;}

export function getConfigAnimeDbVersion(): string | null | undefined {
	const db = getDatabase();

	return (db.prepare(`
      SELECT settingValue
      FROM config
      WHERE settingKey = ?;
	`).get(KEY_USER_DB_ANIME_DB_VERSION) as StringSettingValue)?.settingValue;
}

export function setConfigAnimeDbVersion(version: string): void {
	const db = getDatabase();

	db.prepare(`
      INSERT INTO config (settingKey, settingValue)
      VALUES (?, ?)
      ON CONFLICT(settingKey)
          DO UPDATE SET settingValue = excluded.settingValue;
	`).run(
		KEY_USER_DB_ANIME_DB_VERSION,
		version,
	);
}

