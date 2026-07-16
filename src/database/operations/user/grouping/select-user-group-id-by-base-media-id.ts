import { getDatabase } from "../../../utils/get-db";

type UserGroupIdRow = {
	id: number;
};

/**
 * Resolve one current user-owned Group row by its primary base-media identity.
 */
export function selectUserGroupIdByBaseMediaId(baseMediaId: number): number | undefined {
	const row = getDatabase()
		.prepare(`
      SELECT id
      FROM userGroups
      WHERE baseMediaId = ?
		`)
		.get(baseMediaId) as UserGroupIdRow | undefined;

	return typeof row?.id === "number"
		? row.id
		: undefined;
}
