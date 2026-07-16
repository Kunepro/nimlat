import { UserDbConfigFacade } from "./user-db-config.facade";
import { UserDbDownloadSearchFacade } from "./user-db-download-search.facade";
import { UserDbExternalTrackingFacade } from "./user-db-external-tracking.facade";
import { UserDbGroupingReconcileFacade } from "./user-db-grouping-reconcile.facade";
import { UserDbGroupingFacade } from "./user-db-grouping.facade";
import { UserDbIntegrationFacade } from "./user-db-integration.facade";
import { UserDbOverridesFacade } from "./user-db-overrides.facade";
import { UserDbReleaseWatchFacade } from "./user-db-release-watch.facade";

// Central DB control panel for user_data consumers. Keep this class free of
// business logic; each panel delegates to DB operations through logged facades.
export class UserDbFacade {
	public static config = UserDbConfigFacade;

	public static downloadSearch = UserDbDownloadSearchFacade;

	public static releaseWatch = UserDbReleaseWatchFacade;

	public static overrides = UserDbOverridesFacade;

	public static integration = UserDbIntegrationFacade;

	public static externalTracking = UserDbExternalTrackingFacade;

	public static grouping = UserDbGroupingFacade;

	public static groupingReconcile = UserDbGroupingReconcileFacade;
}
