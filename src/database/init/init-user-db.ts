import type { Database } from "better-sqlite3";
import { runSchemaInitTransaction } from "./schema-init-transaction";
import {
	applyAllPendingSchemaMigrations,
	initSchemaMigrationsTable,
} from "./schema-migrations";
import { initUserConfigSchema } from "./user-db-config-schema";
import { initUserDownloadSearchSchema } from "./user-db-download-search-schema";
import { initUserExternalTrackingSchema } from "./user-db-external-tracking-schema";
import { initUserGroupingSchema } from "./user-db-grouping-schema";
import { initUserIndexes } from "./user-db-indexes";
import { initUserIntegrationStateSchema } from "./user-db-integration-state-schema";
import { initUserReleaseWatchSchema } from "./user-db-release-watch-schema";

// Initialize the user_data schema owned by the local installation. Tables here
// store user configuration, user grouping choices, download-search preferences,
// migration bookkeeping, and other state that must not ship inside AnimeDB.
export function initUserDb(db: Database): void {
	runSchemaInitTransaction(
		db,
		() => {
			initUserConfigSchema(db);
			initSchemaMigrationsTable(db);
			initUserGroupingSchema(db);
			initUserExternalTrackingSchema(db);
			initUserIntegrationStateSchema(db);
			initUserReleaseWatchSchema(db);
			initUserDownloadSearchSchema(db);
			initUserIndexes(db);
			applyAllPendingSchemaMigrations(db);
		},
	);
}
