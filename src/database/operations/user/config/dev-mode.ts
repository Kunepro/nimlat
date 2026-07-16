import { KEY_USER_DB_DEV_MODE } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";

interface BooleanSettingValue {
	settingValue: string | number | boolean | null | undefined;
}

// `devMode` is edited manually in the DB for debugging/development affordances.
// It never means "write official AnimeDB curation changes"; that is adminMode.
// Be tolerant of common boolean-like encodings because this flag is often flipped by hand.
function isTruthyConfigValue(value: BooleanSettingValue["settingValue"]): boolean {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "number") {
		return value !== 0;
	}

	if (typeof value !== "string") {
		return false;
	}

	const normalized = value.trim().toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

// Note: No setter function is provided as devMode is read-only from the application
// It can only be modified by directly accessing the database
export function getIsDevModeEnabled(): boolean {
	const db = getDatabase();

	const result = db
		.prepare(
			`SELECT settingValue FROM config WHERE settingKey = ?;`,
		)
		.get(KEY_USER_DB_DEV_MODE) as BooleanSettingValue;

	return isTruthyConfigValue(result?.settingValue);
}
