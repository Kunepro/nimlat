import {
	getConfigAnimeDbVersion,
	setConfigAnimeDbVersion,
} from "./config/anime-db-version";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Catalog config owns the installed AnimeDB version marker used by startup and
// grouping reconcile. It is not schema versioning or migration authorization.
export const UserDbConfigCatalogFacade = {
	// Get the anime database version.
	getAnimeDbVersion: (): string | null | undefined => {
		return runUserDbFacadeOperation(
			"user-db.facade.config.getAnimeDbVersion",
			() => getConfigAnimeDbVersion(),
		);
	},

	// Persist the anime database version used by grouping/reconcile flows.
	setAnimeDbVersion: (version: string): void => {
		runUserDbFacadeOperation(
			"user-db.facade.config.setAnimeDbVersion",
			() => setConfigAnimeDbVersion(version),
			{ version },
		);
	},
} as const;
