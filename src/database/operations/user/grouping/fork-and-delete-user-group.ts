import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { deleteUserGroupInternal } from "./delete-user-group";
import { forkAnimeGroupingToUserSnapshotInternal } from "./fork-anime-grouping-to-user-snapshot";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Fork anime-mode grouping into user_data and delete the chosen Group in the same transaction.
export function forkAndDeleteUserGroup(groupId: number): GroupingMutationImpactDto {
	const db                              = getDatabase();
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: [],
		affectedGroupIds: [ groupId ],
	};

	db.transaction(() => {
		forkAnimeGroupingToUserSnapshotInternal(db);
		result = deleteUserGroupInternal(
			db,
			groupId,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("forkAndDeleteGroup");

	return result;
}
