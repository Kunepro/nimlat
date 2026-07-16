import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";

type HiddenOfficialGroupRow = {
	animeGroupId: number;
};

// noinspection SqlResolve
const STMT_SELECT_HIDDEN_OFFICIAL_GROUP = sql`
    SELECT animeGroupId
    FROM userHiddenOfficialGroups
    WHERE animeGroupId = ?
    LIMIT 1
`;

/**
 * Check whether one official Group is currently suppressed in user_data.
 */
export function selectIsOfficialGroupHidden(animeGroupId: number): boolean {
	const db = getDatabase();
	return Boolean(db.prepare(STMT_SELECT_HIDDEN_OFFICIAL_GROUP).get(animeGroupId) as HiddenOfficialGroupRow | undefined);
}
