import { debug } from "@nimlat/database";
import { getIsAdminModeEnabled } from "./config/admin-mode";
import { getIsDevModeEnabled } from "./config/dev-mode";
import {
	getLastRoute,
	setLastRoute,
} from "./config/last-route";
import {
	getWindowBounds,
	setWindowBounds,
} from "./config/window-bounds";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

type WindowBoundsInput = Parameters<typeof setWindowBounds>[0];

// Runtime config is local machine state: dev/admin flags, debug logging,
// restored route, and window bounds. It is not portable catalog data.
export const UserDbConfigRuntimeFacade = {
	// Check if dev mode is enabled.
	isDevModeEnabled: (): boolean => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.isDevModeEnabled",
			() => getIsDevModeEnabled(),
		);
	},

	// Check if AnimeDB curation mode is enabled.
	isAdminModeEnabled: (): boolean => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.isAdminModeEnabled",
			() => getIsAdminModeEnabled(),
		);
	},

	// Check if debugging mode is enabled.
	isDebuggingModeEnabled: (): boolean => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.isDebuggingModeEnabled",
			() => debug(),
		);
	},

	// Get the last saved window bounds or null if none are stored.
	getWindowBounds: (): ReturnType<typeof getWindowBounds> => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.getWindowBounds",
			() => getWindowBounds(),
		);
	},

	// Save the current window bounds.
	setWindowBounds: (bounds: WindowBoundsInput): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setWindowBounds",
			() => setWindowBounds(bounds),
			{ ...bounds },
		);
	},

	// Persisted renderer route is restored on startup after catalog readiness checks pass.
	getLastRoute: (): string | null => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.getLastRoute",
			() => getLastRoute(),
		);
	},

	setLastRoute: (route: string): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setLastRoute",
			() => setLastRoute(route),
			{ route },
		);
	},
} as const;
