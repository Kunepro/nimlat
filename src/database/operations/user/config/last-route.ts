import { KEY_USER_DB_LAST_ROUTE } from "@nimlat/constants/main/database-user-keys";
import { getDatabase } from "../../../utils/get-db";

interface LastRouteSettingValue {
	settingValue: string | null | undefined;
}

function isRestorableRoute(route: string): boolean {
	return route.startsWith("/groups")
		|| route.startsWith("/release-watch")
		|| route.startsWith("/errored-content");
}

export function getLastRoute(): string | null {
	const result = getDatabase()
		.prepare(`SELECT settingValue FROM config WHERE settingKey = ?;`)
		.get(KEY_USER_DB_LAST_ROUTE) as LastRouteSettingValue;

	const route = result?.settingValue?.trim();
	if (!route || !route.startsWith("/") || !isRestorableRoute(route)) {
		return null;
	}

	return route;
}

export function setLastRoute(route: string): void {
	const normalizedRoute = route.trim();
	if (!normalizedRoute.startsWith("/") || !isRestorableRoute(normalizedRoute)) {
		return;
	}

	getDatabase()
		.prepare(
			`INSERT INTO config (settingKey, settingValue)
       VALUES (?, ?)
       ON CONFLICT(settingKey) DO UPDATE SET settingValue = excluded.settingValue;`,
		)
		.run(
			KEY_USER_DB_LAST_ROUTE,
			normalizedRoute,
		);
}
