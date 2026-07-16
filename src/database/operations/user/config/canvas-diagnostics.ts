import { KEY_USER_DB_CANVAS_DIAGNOSTICS_ENABLED } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";

interface BooleanSettingValue {
	settingValue: string | number | boolean | null | undefined;
}

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

// Canvas diagnostics are opt-in even for dev builds because they add a polling overlay to every media wall.
export function getIsCanvasDiagnosticsEnabled(): boolean {
	const result = getDatabase()
		.prepare(`SELECT settingValue FROM config WHERE settingKey = ?;`)
		.get(KEY_USER_DB_CANVAS_DIAGNOSTICS_ENABLED) as BooleanSettingValue | undefined;

	return isTruthyConfigValue(result?.settingValue);
}

export function setIsCanvasDiagnosticsEnabled(enabled: boolean): void {
	getDatabase()
		.prepare(
			`INSERT INTO config (settingKey, settingValue)
       VALUES (?, ?)
       ON CONFLICT(settingKey) DO UPDATE SET settingValue = excluded.settingValue;`,
		)
		.run(
			KEY_USER_DB_CANVAS_DIAGNOSTICS_ENABLED,
			enabled ? "true" : "false",
		);
}
