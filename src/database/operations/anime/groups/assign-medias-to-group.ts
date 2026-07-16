import { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";

export function _assignMediasToGroup(
	db: Database,
	groupId: number,
	mediaIds: number[],
	isOfficial: boolean,
): void {
	// noinspection SqlResolve
	const linkMedias   = db.prepare(`
      INSERT OR IGNORE INTO anime_data.groupMedia (mediaId, groupId, isOfficial)
      VALUES (?, ?, ?)
	`);
	const officialFlag = isOfficial ? 1 : 0;

	for (const mediaId of new Set(mediaIds)) {
		linkMedias.run(
			mediaId,
			groupId,
			officialFlag,
		);
	}
}

export function assignMediasToGroup(
	groupId: number,
	mediaIds: number[],
	isOfficial = true,
): void {
	if (mediaIds.length === 0) {
		return;
	}

	const db = getDatabase();
	db.transaction(() => {
		const checkGroup  = db.prepare(`
        SELECT id
        FROM anime_data.groups
        WHERE id = ?
		`);
		const groupExists = checkGroup.get(groupId);

		if (!groupExists) {
			throw new Error(`Group with ID ${ groupId } does not exist`);
		}

		_assignMediasToGroup(
			db,
			groupId,
			mediaIds,
			isOfficial,
		);
	})();
}
