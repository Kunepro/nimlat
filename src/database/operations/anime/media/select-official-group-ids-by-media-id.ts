import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type OfficialGroupIdRow = {
	groupId: number;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT groupId
    FROM anime_data.groupMedia
    WHERE mediaId = ?
      AND isOfficial = 1
    ORDER BY groupId ASC
`;

// Read official Group memberships for recomputation cleanup. User-created
// assignments live in user_data and must never be mutated through this result.
export function selectOfficialGroupIdsByMediaId(mediaId: number): number[] {
	const rows = getDatabase()
		.prepare(STMT)
		.all(mediaId) as OfficialGroupIdRow[];

	return rows.map(row => row.groupId);
}
