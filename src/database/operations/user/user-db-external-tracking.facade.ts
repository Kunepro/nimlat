import { UserDbExternalTrackingAccountFacade } from "./user-db-external-tracking-account.facade";
import { UserDbExternalTrackingImportFacade } from "./user-db-external-tracking-import.facade";
import { UserDbExternalTrackingWatchFacade } from "./user-db-external-tracking-watch.facade";

// Public user_data external-tracking panel. Domain-specific subfacades keep
// account, import, and watch-state ownership visible to maintainers.
export const UserDbExternalTrackingFacade = {
	...UserDbExternalTrackingAccountFacade,
	...UserDbExternalTrackingWatchFacade,
	...UserDbExternalTrackingImportFacade,
} as const;
