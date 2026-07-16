import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

// Delete a Group and leave any newly orphaned medias standalone.
export function deleteGroupById(groupId: number): void {
	const db = getDatabase();

	try {
		db.transaction(() => {
			removeAllMediaLinksFromGroup(
				db,
				groupId,
			);
			deleteGroupRow(
				db,
				groupId,
			);
		})();
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"anime-db.operations.groups.deleteGroupById",
			typeSafeError(error),
			{ groupId },
		);

		throw error;
	}
}

function removeAllMediaLinksFromGroup(db: Database, groupId: number): void {
	const statement = db.prepare(`
    DELETE
    FROM anime_data.groupMedia
    WHERE groupId = ?
	`);
	statement.run(groupId);
}

function deleteGroupRow(db: Database, groupId: number): void {
	const statement = db.prepare(`
    DELETE
    FROM anime_data.groups
    WHERE id = ?
	`);
	statement.run(groupId);
}
