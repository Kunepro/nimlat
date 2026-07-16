import type { Database } from "better-sqlite3";
import { initAnimeCatalogSchema } from "./anime-db-catalog-schema";
import { initAnimeHydrationSchema } from "./anime-db-hydration-schema";
import { initAnimeIndexes } from "./anime-db-indexes";
import { initAnimePeopleSchema } from "./anime-db-people-schema";
import { runSchemaInitTransaction } from "./schema-init-transaction";

// Final pre-release anime_data schema. The init is split by domain, but this
// orchestrator keeps one transaction so a failed create/index pass rolls back.
export function initAnimeDb(db: Database): void {
	runSchemaInitTransaction(
		db,
		() => {
			initAnimeCatalogSchema(db);
			initAnimePeopleSchema(db);
			initAnimeHydrationSchema(db);
			initAnimeIndexes(db);
		},
	);
}
