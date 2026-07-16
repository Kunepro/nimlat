import { KEY_USER_DB_PREFERRED_TITLE_LANGUAGE } from "@nimlat/constants/main/database-user-keys";
import {
	DEFAULT_PREFERRED_TITLE_LANGUAGE,
	isPreferredTitleLanguage,
	type PreferredTitleLanguage,
} from "@nimlat/types/user-config";
import { getDatabase } from "../../../utils/get-db";

interface PreferredTitleLanguageSettingValue {
	settingValue: string | null | undefined;
}

export function getPreferredTitleLanguage(): PreferredTitleLanguage {
	const result = getDatabase()
		.prepare(`SELECT settingValue FROM config WHERE settingKey = ?;`)
		.get(KEY_USER_DB_PREFERRED_TITLE_LANGUAGE) as PreferredTitleLanguageSettingValue | undefined;

	return isPreferredTitleLanguage(result?.settingValue)
		? result.settingValue
		: DEFAULT_PREFERRED_TITLE_LANGUAGE;
}

export function setPreferredTitleLanguage(language: PreferredTitleLanguage): void {
	if (!isPreferredTitleLanguage(language)) {
		throw new Error(`Unsupported preferred title language: ${ String(language) }`);
	}

	getDatabase()
		.prepare(
			`INSERT INTO config (settingKey, settingValue)
       VALUES (?, ?)
       ON CONFLICT(settingKey) DO UPDATE SET settingValue = excluded.settingValue;`,
		)
		.run(
			KEY_USER_DB_PREFERRED_TITLE_LANGUAGE,
			language,
		);
}
