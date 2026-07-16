import { UserDbConfigCatalogFacade } from "./user-db-config-catalog.facade";
import { UserDbConfigPreferencesFacade } from "./user-db-config-preferences.facade";
import { UserDbConfigRuntimeFacade } from "./user-db-config-runtime.facade";

// Central config panel for user_data-backed app settings. Subfacades document
// whether a setting belongs to catalog readiness, UI preferences, or runtime state.
export const UserDbConfigFacade = {
	...UserDbConfigCatalogFacade,
	...UserDbConfigPreferencesFacade,
	...UserDbConfigRuntimeFacade,
} as const;
