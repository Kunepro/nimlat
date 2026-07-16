import { KEY_USER_DB_WINDOW_BOUNDS } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";

export interface WindowBounds {
	width: number;
	height: number;
	x?: number;
	y?: number;
	isMaximized?: boolean;
}

interface WindowBoundsSettingValue {
	settingValue: string | null | undefined;
}

export function getWindowBounds(): WindowBounds | null {
	const db = getDatabase();

	const result = db
		.prepare(
			`SELECT settingValue FROM config WHERE settingKey = ?;`,
		)
		.get(KEY_USER_DB_WINDOW_BOUNDS) as WindowBoundsSettingValue;

	if (!result?.settingValue) return null;

	try {
		const parsed = JSON.parse(result.settingValue) as WindowBounds;

		if (typeof parsed?.width !== "number" || typeof parsed?.height !== "number") {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

export function setWindowBounds(bounds: WindowBounds): void {
	const db = getDatabase();

	db.prepare(
		`INSERT INTO config (settingKey, settingValue)
     VALUES (?, ?)
     ON CONFLICT(settingKey) DO UPDATE SET settingValue = excluded.settingValue;`,
	).run(
		KEY_USER_DB_WINDOW_BOUNDS,
		JSON.stringify(bounds),
	);
}

