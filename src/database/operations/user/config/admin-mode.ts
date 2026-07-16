import { KEY_USER_DB_ADMIN_MODE } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";

interface BooleanSettingValue {
	settingValue: string | number | boolean | null | undefined;
}

// `adminMode` is a manual DB switch for AnimeDB curation builds, separate from devMode.
// When true, admin review edits become official anime_data changes instead of user_data overlays/snapshots.
// Accept the same common boolean encodings as devMode without exposing an in-app setter.
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

// Admin mode makes manual curation writes official by targeting anime_data instead
// of user_data overlays or grouping snapshots.
export function getIsAdminModeEnabled(): boolean {
	const db = getDatabase();

	const result = db
		.prepare(
			`SELECT settingValue FROM config WHERE settingKey = ?;`,
		)
		.get(KEY_USER_DB_ADMIN_MODE) as BooleanSettingValue;

	return isTruthyConfigValue(result?.settingValue);
}
