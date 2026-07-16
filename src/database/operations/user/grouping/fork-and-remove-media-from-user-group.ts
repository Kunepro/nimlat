import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { forkAnimeGroupingToUserSnapshotInternal } from "./fork-anime-grouping-to-user-snapshot";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";
import { removeMediaFromUserGroupInternalWithImpact } from "./remove-media-from-user-group";

// Fork anime-mode grouping into user_data and apply the first manual removal
// in the same transaction so the app never ends up half-switched if the write fails.
export function forkAndRemoveMediaFromUserGroup(groupId: number, mediaId: number): GroupingMutationImpactDto {
	const db                              = getDatabase();
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: [],
		affectedGroupIds: [ groupId ],
	};

	db.transaction(() => {
		forkAnimeGroupingToUserSnapshotInternal(db);
		result = removeMediaFromUserGroupInternalWithImpact(
			db,
			groupId,
			mediaId,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("forkAndRemoveMediaFromGroup");

	return result;
}
