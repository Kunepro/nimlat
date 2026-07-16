import { getDatabase } from "../../../utils/get-db";

type UserGroupBaseMediaIdRow = {
	baseMediaId: number | null;
};

/**
 * Read the primary canonical base-media identity for one current user-owned Group row.
 */
export function selectUserGroupBaseMediaIdById(groupId: number): number | undefined {
	const row = getDatabase()
		.prepare(`
      SELECT userGroups.baseMediaId AS baseMediaId
      FROM userGroups
      LEFT JOIN anime_data.media baseMedia
             ON baseMedia.mediaId = userGroups.baseMediaId
      WHERE userGroups.id = ?
		`)
		.get(groupId) as UserGroupBaseMediaIdRow | undefined;

	return typeof row?.baseMediaId === "number"
		? row.baseMediaId
		: undefined;
}

