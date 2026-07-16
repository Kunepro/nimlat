// IPC registration is transport wiring only. Handlers validate/shape requests and
// delegate to services; persistence and domain decisions belong outside this layer.
import { registerAnimeDbDownloadHandlers } from "./anime-db-download-handlers";
import { registerAnimeDbPopulateHandlers } from "./anime-db-populate-handlers";
import { registerAnimeDbStartupReadinessHandlers } from "./anime-db-startup-readiness-handlers";
import { registerAnimeDbUpdateHandlers } from "./anime-db-update-handlers";
import { registerAppUpdateHandlers } from "./app-update-handlers";
import { registerConfigHandlers } from "./config-handlers";
import { registerDownloadSearchHandlers } from "./download-search-handlers";
import { registerExternalNavigationHandlers } from "./external-navigation-handlers";
import { registerExternalTrackingHandlers } from "./external-tracking-handlers";
import { registerGroupExplorerHandlers } from "./group-explorer-handlers";
import { registerGroupManualAssignmentHandlers } from "./group-manual-assignment-handlers";
import { registerHydratorHandlers } from "./hydrator-handlers";
import { registerNetworkHandlers } from "./network-handlers";
import { registerReleaseWatchHandlers } from "./release-watch-handlers";
import { registerRendererImageHandlers } from "./renderer-image-handlers";

// Register every main-process channel once during app startup. Domain registrars
// remain separate so adding/removing a feature does not grow a monolithic handler file.
export function registerIpcMainHandlers(): void {
	registerAnimeDbPopulateHandlers();
	registerAnimeDbStartupReadinessHandlers();
	registerAnimeDbDownloadHandlers();
	registerAnimeDbUpdateHandlers();
	registerAppUpdateHandlers();
	registerHydratorHandlers();
	registerGroupExplorerHandlers();
	registerGroupManualAssignmentHandlers();
	registerReleaseWatchHandlers();
	registerDownloadSearchHandlers();
	registerExternalNavigationHandlers();
	registerExternalTrackingHandlers();
	registerConfigHandlers();
	registerRendererImageHandlers();
	registerNetworkHandlers();
}
