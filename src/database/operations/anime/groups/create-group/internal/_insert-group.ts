import { createSearchKey } from "@nimlat/functions";
import { GroupBlueprintDto } from "@nimlat/types/anime-db";
import { Database } from "better-sqlite3";
import { ensureCanonicalGroupLineageByBaseMediaId } from "../../../canonical/canonical-id-resolution";

export function _insertGroup(db: Database, group: Omit<GroupBlueprintDto, "id">): number {
	const groupLineageId = ensureCanonicalGroupLineageByBaseMediaId(
		db,
		group.baseMediaId,
	);

	// noinspection SqlResolve
	const stmt = db.prepare(`
      INSERT INTO anime_data.groups (groupLineageId, baseMediaId, name, nameSearchKey, description, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?)
	`);

	return stmt.run(
		groupLineageId,
		group.baseMediaId,
		group.name,
		createSearchKey(group.name),
		group.description ?? null,
		group.imageUrl ?? null,
	).lastInsertRowid as number;
}

