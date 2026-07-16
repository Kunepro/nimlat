import { getDatabase } from "../../../utils/get-db";

/**
 * Count current user-owned Group rows in the forked grouping snapshot.
 */
export function countUserGroups(): number {
	return (getDatabase()
		.prepare(`
      SELECT COUNT(*) AS total
      FROM userGroups
		`)
		.get() as { total: number }).total;
}

