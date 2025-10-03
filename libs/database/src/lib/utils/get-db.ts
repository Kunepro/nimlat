import { BUS_Database } from "@nimlat/busses";
import { Database } from "better-sqlite3";

export function getDatabase(): Database {
	const db = BUS_Database.getValue();
	
	if (!db || !db.open) {
		throw new Error("Something went wrong. Database not initialized.");
	}
	
	return db;
}
