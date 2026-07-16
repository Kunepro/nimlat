import { getDatabase } from "../../../utils/get-db";

/**
 * Read every visible media id currently represented in the forked user grouping snapshot.
 * These are canonical internal media ids, because grouping mutations and renderer-visible
 * side effects are now internal-id based.
 */
export function selectAllUserGroupMediaIds(): number[] {
	return (
		getDatabase()
			// noinspection SqlResolve
			.prepare<[], { mediaId: number }>(`
      SELECT DISTINCT media.mediaId AS mediaId
      FROM userGroupMedias
      JOIN anime_data.media media
           ON media.mediaId = userGroupMedias.mediaId
      ORDER BY media.mediaId ASC
			`)
			.all()
	).map((row) => row.mediaId);
}
