import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type MediaLastRefreshRow = {
	lastUpdatedAt: number | null;
};

// noinspection SqlResolve
const STMT = sql`
    SELECT lastUpdatedAt
    FROM anime_data.media
    WHERE mediaId = ?
      AND isStub = 0
`;

export function selectMediaLastRefreshAtById(mediaId: number): number | undefined {
	const row = getDatabase()
		.prepare(STMT)
		.get(mediaId) as MediaLastRefreshRow | undefined;

	return typeof row?.lastUpdatedAt === "number"
		? row.lastUpdatedAt
		: undefined;
}
