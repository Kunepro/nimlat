import { GroupBlueprintDto } from "@nimlat/types/anime-db";
import { Statement } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type GroupIdRow = Pick<GroupBlueprintDto, "id">;

// noinspection SqlResolve
const STMT = sql`
    SELECT id
    FROM anime_data.groups
    WHERE baseMediaId = ?
`;

let stmt: Statement<[ number ], GroupIdRow>;

// Prepared statement accessor kept private so callers use the named read operation.
function selectGroupIdByBaseMediaId() {
	if (!stmt) {
		stmt = getDatabase().prepare<[ number ], GroupIdRow>(STMT);
	}
	return stmt;
}

// Resolve one official Group row by its canonical base Media ID.
export function selectGroupIdRowByBaseMediaId(baseMediaId: number): GroupIdRow | undefined {
	return selectGroupIdByBaseMediaId().get(baseMediaId);
}

