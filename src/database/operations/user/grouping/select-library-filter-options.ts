import { LibraryFilterOptions } from "@nimlat/types/ipc-payloads";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type FilterNameRow = {
	name: string;
};

// Library filter options are catalog metadata, but they are read through the attached
// user DB connection so the renderer gets one bounded, IPC-safe payload.
export function selectLibraryFilterOptions(): LibraryFilterOptions {
	const db = getDatabase();
	const genreRows = db.prepare(sql`
        SELECT name
        FROM anime_data.genres
        WHERE TRIM(name) <> ''
        ORDER BY name COLLATE NOCASE ASC
	`).all() as FilterNameRow[];
	const tagRows = db.prepare(sql`
        SELECT name
        FROM anime_data.tags
        WHERE name IS NOT NULL
          AND TRIM(name) <> ''
          AND COALESCE(isGeneralSpoiler, 0) = 0
          AND COALESCE(isMediaSpoiler, 0) = 0
        GROUP BY name
        ORDER BY name COLLATE NOCASE ASC
	`).all() as FilterNameRow[];

	return {
		genreNames: genreRows.map(row => row.name),
		tagNames:   tagRows.map(row => row.name),
	};
}
