import { KEY_USER_DB_ADULT_CONTENT } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";

interface BooleanSettingValue {
	settingValue: "true" | "false" | null | undefined;
}

export function getIsAdultContentEnabled(): boolean {
	const db = getDatabase();

	const result = db
		.prepare(
			`SELECT settingValue FROM config WHERE settingKey = ?;`,
		)
		.get(KEY_USER_DB_ADULT_CONTENT) as BooleanSettingValue;

	return result?.settingValue === "true";
}

export function setIsAdultContentEnabled(value: boolean): void {
	const db = getDatabase();

	db.prepare(
		`INSERT INTO config (settingKey, settingValue)
     VALUES (?, ?)
     ON CONFLICT(settingKey) DO UPDATE SET settingValue = excluded.settingValue;`,
	).run(
		KEY_USER_DB_ADULT_CONTENT,
		value ? "true" : "false",
	);
}

