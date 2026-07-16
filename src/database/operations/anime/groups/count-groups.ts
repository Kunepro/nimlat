import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

// noinspection SqlResolve
const STMT_COUNT_IPS = sql`
    SELECT COUNT(*) AS total
    FROM anime_data.groups
`;

/**
 * Return the total number of Group containers currently stored in the local DB.
 */
export function countGroups(): number {
	return (getDatabase()
		.prepare(STMT_COUNT_IPS)
		.get() as { total: number }).total;
}
