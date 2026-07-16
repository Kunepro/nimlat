import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { forkAnimeGroupingToUserSnapshotInternal } from "./fork-anime-grouping-to-user-snapshot";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";
import { mergeUserGroupsIntoTargetInternal } from "./merge-user-groups-into-target";

// Fork anime-mode grouping into user_data and merge source Groups into a target Group
// in the same transaction.
export function forkAndMergeUserGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): GroupingMutationImpactDto {
	const db                              = getDatabase();
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: [],
		affectedGroupIds: [ targetGroupId ],
	};

	db.transaction(() => {
		forkAnimeGroupingToUserSnapshotInternal(db);
		result = mergeUserGroupsIntoTargetInternal(
			db,
			targetGroupId,
			sourceGroupIds,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("forkAndMergeGroupsIntoTarget");

	return result;
}
