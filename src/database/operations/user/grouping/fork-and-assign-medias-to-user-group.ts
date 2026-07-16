import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { assignMediasToUserGroupInternal } from "./assign-medias-to-user-group";
import { forkAnimeGroupingToUserSnapshotInternal } from "./fork-anime-grouping-to-user-snapshot";
import { ensureUserGroupExistsInternal } from "./grouping-mutation-internals";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Fork anime-mode grouping into user_data and apply the first manual assignment
// in the same transaction so the app never ends up half-switched if the write fails.
export function forkAndAssignMediasToUserGroup(groupId: number, mediaIds: number[]): GroupingMutationImpactDto {
	const db                              = getDatabase();
	const normalizedMediaIds              = [ ...new Set(mediaIds) ];
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: normalizedMediaIds,
		affectedGroupIds: [ groupId ],
	};

	db.transaction(() => {
		forkAnimeGroupingToUserSnapshotInternal(db);
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
	logGroupingDiagnosticsIfDebuggingEnabled("forkAndAssignMediasToGroup");

	return result;
}
