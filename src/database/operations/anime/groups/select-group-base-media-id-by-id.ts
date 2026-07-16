import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type GroupBaseMediaIdRow = {
	baseMediaId: number | null;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT baseMediaId
    FROM anime_data.groups
    WHERE id = ?
`;

/**
 * Read the canonical base Media ID for one Group row.
 */
export function selectGroupBaseMediaIdById(groupId: number): number | undefined {
	const row = getDatabase()
		.prepare(STMT)
		.get(groupId) as GroupBaseMediaIdRow | undefined;

	return typeof row?.baseMediaId === "number"
		? row.baseMediaId
		: undefined;
}
