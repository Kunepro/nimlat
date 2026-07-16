import type { AnimeDbReadinessFactsDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

interface SchemaTableRow {
	name: string;
}

interface CatalogPresenceRow {
	hasCatalogMedia: number;
	hasCatalogGroups: number;
}

const REQUIRED_TABLES = [
	"media",
	"groups",
	"groupLineages",
	"scanState",
] as const;

// noinspection SqlResolve
const STMT_SELECT_REQUIRED_TABLES = sql`
    SELECT name
    FROM anime_data.sqlite_master
    WHERE type = 'table'
      AND name IN ('media', 'groups', 'groupLineages', 'scanState')
`;

// noinspection SqlResolve
const STMT_SELECT_CATALOG_PRESENCE = sql`
    SELECT EXISTS(SELECT 1
                  FROM anime_data.media
                  WHERE COALESCE(isStub, 0) = 0
                  LIMIT 1) AS hasCatalogMedia,
           EXISTS(SELECT 1
                  FROM anime_data.groups
                  LIMIT 1) AS hasCatalogGroups
`;

export function selectAnimeDbReadinessFacts(): AnimeDbReadinessFactsDto {
	const db            = getDatabase();
	const existingTables = new Set(
		db.prepare(STMT_SELECT_REQUIRED_TABLES)
			.all()
			.map((row) => (row as SchemaTableRow).name),
	);
	const missingTables = REQUIRED_TABLES.filter((tableName) => !existingTables.has(tableName));

	if (missingTables.length > 0) {
		return {
			hasRequiredSchema: false,
			hasCatalogMedia:  false,
			hasCatalogGroups: false,
			missingTables,
		};
	}

	const row = db.prepare(STMT_SELECT_CATALOG_PRESENCE)
		.get() as CatalogPresenceRow;

	return {
		hasRequiredSchema: true,
		hasCatalogMedia:  row.hasCatalogMedia === 1,
		hasCatalogGroups: row.hasCatalogGroups === 1,
		missingTables,
	};
}
