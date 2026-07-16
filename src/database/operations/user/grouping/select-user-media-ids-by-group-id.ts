import { getDatabase } from "../../../utils/get-db";

/**
 * Read canonical media ids currently linked to one user-owned Group row.
 */
export function selectUserMediaIdsByGroupId(groupId: number): number[] {
	return (getDatabase()
		.prepare(`
      SELECT media.mediaId AS mediaId
      FROM userGroupMedias
      JOIN anime_data.media media
           ON media.mediaId = userGroupMedias.mediaId
      WHERE userGroupMedias.groupId = ?
      ORDER BY media.mediaId ASC
		`)
		.all(groupId) as Array<{ mediaId: number }>)
		.map(row => row.mediaId);
}

