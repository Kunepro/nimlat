import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { ensureUserGroupExistsInternal } from "./grouping-mutation-internals";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

function assignMediasToUserGroupInternal(db: Database, groupId: number, mediaIds: number[]): void {
	// noinspection SqlResolve
	const insertMembershgroup = db.prepare(`
      INSERT OR IGNORE INTO userGroupMedias (groupId, mediaId)
      VALUES (?, ?)
	`);

	for (const candidateMediaId of new Set(mediaIds)) {
		insertMembershgroup.run(
			groupId,
			candidateMediaId,
		);
	}
}

// Attach one or more canonical medias to an existing user-owned Group row.
export function assignMediasToUserGroup(groupId: number, mediaIds: number[]): GroupingMutationImpactDto {
	const normalizedMediaIds = [ ...new Set(mediaIds) ];
	if (normalizedMediaIds.length === 0) {
		return {
			affectedMediaIds: [],
			affectedGroupIds: [],
		};
	}


	const db = getDatabase();
	db.transaction(() => {
		ensureUserGroupExistsInternal(
			db,
			groupId,
		);

		assignMediasToUserGroupInternal(
			db,
			groupId,
			normalizedMediaIds,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("assignMediasToGroup");

	return {
		affectedMediaIds: normalizedMediaIds,
		affectedGroupIds: [ groupId ],
	};
}

export {
	assignMediasToUserGroupInternal,
};
