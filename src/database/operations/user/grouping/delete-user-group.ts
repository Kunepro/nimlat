import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import {
	deleteUserGroupContainerInternal,
	ensureUserGroupExistsInternal,
	selectLineageBaseMediaIdsByUserGroupIdsInternal,
	selectUserGroupMediaIdsInternal,
	syncLineageForAnimeBaseMediaIdsInternal,
} from "./grouping-mutation-internals";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Delete one user-owned Group container.
//
// Any media that still belongs to other Groups keeps those memberships. Newly orphaned medias
// stay orphaned so Library can show them as standalone media rows.
function deleteUserGroupInternal(db: Database, groupId: number): GroupingMutationImpactDto {
	const affectedGroupIds = new Set<number>([ groupId ]);
	let affectedMediaIds: number[];

	ensureUserGroupExistsInternal(
		db,
		groupId,
	);
	const lineageBaseMediaIdsBeforeMutation = selectLineageBaseMediaIdsByUserGroupIdsInternal(
		db,
		[ groupId ],
	);
	affectedMediaIds                        = selectUserGroupMediaIdsInternal(
		db,
		groupId,
	);

	deleteUserGroupContainerInternal(
		db,
		groupId,
	);

	syncLineageForAnimeBaseMediaIdsInternal(
		db,
		[
			...lineageBaseMediaIdsBeforeMutation,
			...affectedMediaIds,
		],
	);

	return {
		affectedMediaIds,
		affectedGroupIds: [ ...affectedGroupIds ],
	};
}

export function deleteUserGroup(groupId: number): GroupingMutationImpactDto {
	const db                              = getDatabase();
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: [],
		affectedGroupIds: [ groupId ],
	};

	db.transaction(() => {
		result = deleteUserGroupInternal(
			db,
			groupId,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("deleteGroup");

	return result;
}

export {
	deleteUserGroupInternal,
};
