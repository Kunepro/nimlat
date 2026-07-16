import type { Database } from "better-sqlite3";

// DB init modules stay split by domain, while this helper preserves the old
// single-transaction behavior for each attached schema init.
export function runSchemaInitTransaction(
	db: Database,
	initSchema: () => void,
): void {
	db.exec("PRAGMA defer_foreign_keys = ON");
	try {
		db.transaction(initSchema)();
	} finally {
		db.exec("PRAGMA defer_foreign_keys = OFF");
	}
}
