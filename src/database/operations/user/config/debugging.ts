import { KEY_USER_DB_DEBUGGING_ENABLED } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";

interface BooleanSettingValue {
	settingValue: "true" | "false" | null | undefined;
}

interface DebuggingCache {
	value: boolean;
	lastReadAt: number;
}

const DEBUGGING_CACHE_TTL_MS         = 5000;
const debuggingCache: DebuggingCache = {
	value:      false,
	lastReadAt: 0,
};

function readDebuggingEnabledFromDb(): boolean {
	const db = getDatabase();

	const result = db
		.prepare(
			`SELECT settingValue FROM config WHERE settingKey = ?;`,
		)
		.get(KEY_USER_DB_DEBUGGING_ENABLED) as BooleanSettingValue;

	return result?.settingValue === "true";
}

// Note: No setter function is provided as debuggingEnabled is read-only from the application
// It can only be modified by directly accessing the database
export function debug(): boolean {
	const now = Date.now();
	if (now - debuggingCache.lastReadAt > DEBUGGING_CACHE_TTL_MS) {
		try {
			debuggingCache.value = readDebuggingEnabledFromDb();
		} catch {
			// Keep the last known value to avoid flgroupping due to transient DB errors.
		}
		debuggingCache.lastReadAt = now;
	}
	return debuggingCache.value;
}

