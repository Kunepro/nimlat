import { BUS_Database } from "@nimlat/busses/main";
import type { Database } from "better-sqlite3";

function isOpenDatabaseHandle(value: unknown): value is Database {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<Database>;
	return candidate.open === true
		&& typeof candidate.prepare === "function"
		&& typeof candidate.exec === "function";
}

export function getDatabase(): Database {
	const db = BUS_Database.getValue();

	if (!isOpenDatabaseHandle(db)) {
		throw new Error("Something went wrong. Database not initialized.");
	}

	return db;
}

