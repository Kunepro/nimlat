import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

// Remove only the group/media edge. Orphaned media stay in anime_data.media and
// are surfaced as standalone Library entries by the read model.
export function removeMediaFromExistingGroup(groupId: number, mediaId: number): void {
	const db = getDatabase();

	try {
		db.transaction(() => {
			removeMediaAssociation(
				db,
				groupId,
				mediaId,
			);
		})();
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logErrorRemoveMediaFromGroup(
			groupId,
			mediaId,
			tsError,
		);

		throw error;
	}
}

function removeMediaAssociation(db: Database, groupId: number, mediaId: number): void {
	const statement = db.prepare(`
      DELETE
      FROM anime_data.groupMedia
      WHERE groupId = ?
        AND mediaId = ?
	`);
	statement.run(
		groupId,
		mediaId,
	);
}
