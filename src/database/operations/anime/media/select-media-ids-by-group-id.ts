import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type MediaIdRow = {
	mediaId: number;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT groupMedia.mediaId
    FROM anime_data.groupMedia groupMedia
             INNER JOIN anime_data.media media
                        ON media.mediaId = groupMedia.mediaId
    WHERE groupMedia.groupId = ?
      AND media.isStub = 0
    ORDER BY groupMedia.mediaId ASC
`;

export function selectMediaIdsByGroupId(groupId: number): number[] {
	const rows = getDatabase()
		.prepare(STMT)
		.all(groupId) as MediaIdRow[];

	return rows.map(row => row.mediaId);
}
