import type { Database } from "better-sqlite3";

export type AttachedDatabaseSchemaName = "anime_data" | "image_data";

type PragmaDatabaseListRow = {
	seq: number;
	name: string;
	file: string;
};

const PRAGMA_SETTINGS = [
	"journal_mode = WAL",
	"synchronous = NORMAL",
	"temp_store = MEMORY",
	"cache_size = -8192",
	"locking_mode = NORMAL",
	"mmap_size = 268435456",
	"busy_timeout = 5000",
] as const;

function escapeSqlString(value: string): string {
	return value.replace(
		/'/g,
		"''",
	);
}

export function applyDatabasePragmas(db: Database, schemaName?: AttachedDatabaseSchemaName): void {
	const prefix = schemaName
		? `${ schemaName }.`
		: "";

	PRAGMA_SETTINGS.forEach(setting => db.pragma(`${ prefix }${ setting }`));
}

export function attachDatabase(
	db: Database,
	filePath: string,
	schemaName: AttachedDatabaseSchemaName,
): void {
	const escapedPath = escapeSqlString(filePath);
	db.exec(`ATTACH DATABASE '${ escapedPath }' AS ${ schemaName };`);
	applyDatabasePragmas(
		db,
		schemaName,
	);
}

export function isDatabaseAttached(
	db: Database,
	schemaName: AttachedDatabaseSchemaName,
): boolean {
	const databaseListRows = db
		.prepare<[], PragmaDatabaseListRow>("PRAGMA database_list")
		.all();
	return databaseListRows.some((row) => row.name === schemaName);
}

export function detachDatabaseIfAttached(
	db: Database,
	schemaName: AttachedDatabaseSchemaName,
): boolean {
	if (!isDatabaseAttached(
		db,
		schemaName,
	)) {
		return false;
	}

	db.exec(`DETACH DATABASE ${ schemaName };`);
	return true;
}
