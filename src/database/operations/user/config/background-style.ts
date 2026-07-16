import { KEY_USER_DB_BACKGROUND_STYLE } from "@nimlat/constants/main/database-user-keys";
import {
	type BackgroundStyle,
	DEFAULT_BACKGROUND_STYLE,
	isBackgroundStyle,
} from "@nimlat/types/user-config";
import { getDatabase } from "../../../utils/get-db";

interface BackgroundStyleSettingValue {
	settingValue: string | null | undefined;
}

export function getBackgroundStyle(): BackgroundStyle {
	const result = getDatabase()
		.prepare(`SELECT settingValue FROM config WHERE settingKey = ?;`)
		.get(KEY_USER_DB_BACKGROUND_STYLE) as BackgroundStyleSettingValue | undefined;

	return isBackgroundStyle(result?.settingValue)
		? result.settingValue
		: DEFAULT_BACKGROUND_STYLE;
}

export function setBackgroundStyle(style: BackgroundStyle): void {
	if (!isBackgroundStyle(style)) {
		throw new Error(`Unsupported background style: ${ String(style) }`);
	}

	getDatabase()
		.prepare(
			`INSERT INTO config (settingKey, settingValue)
       VALUES (?, ?)
       ON CONFLICT(settingKey) DO UPDATE SET settingValue = excluded.settingValue;`,
		)
		.run(
			KEY_USER_DB_BACKGROUND_STYLE,
			style,
		);
}
