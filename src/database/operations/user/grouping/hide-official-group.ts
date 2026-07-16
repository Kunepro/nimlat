import { getDatabase } from "../../../utils/get-db";
import { sql } from "../../../utils/sql-flag";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// noinspection SqlResolve
const STMT_INSERT_HIDDEN_OFFICIAL_GROUP = sql`
    INSERT INTO userHiddenOfficialGroups (animeGroupId, hiddenAt)
    VALUES (?, ?)
    ON CONFLICT(animeGroupId) DO UPDATE SET hiddenAt = excluded.hiddenAt
`;

// Hide one official Group from all renderer-facing Library and inspection reads.
// This does not delete source data from `anime_data`; it records a user-local suppression flag.
export function hideOfficialGroup(animeGroupId: number): void {
	const db = getDatabase();
	db.prepare(STMT_INSERT_HIDDEN_OFFICIAL_GROUP).run(
		animeGroupId,
		Date.now(),
	);
	logGroupingDiagnosticsIfDebuggingEnabled("hideOfficialGroup");
}
