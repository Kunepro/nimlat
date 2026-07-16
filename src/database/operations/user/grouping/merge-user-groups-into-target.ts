import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { assignMediasToUserGroupInternal } from "./assign-medias-to-user-group";
import {
	deleteUserGroupContainerInternal,
	ensureUserGroupExistsInternal,
	selectLineageBaseMediaIdsByUserGroupIdsInternal,
	selectUserGroupMediaIdsInternal,
	syncLineageForAnimeBaseMediaIdsInternal,
} from "./grouping-mutation-internals";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Merge one or more source Groups into an existing target Group.
//
// Merge semantics are destructive for the source containers:
// - target keeps its current visible metadata and base-media identity
// - source memberships are unioned into the target
// - source Group rows are deleted afterwards
// - any official lineage previously pointing to the sources is re-resolved onto the target
function assertMergeGroupsExist(db: Database, groupIds: number[]): void {
	groupIds.forEach((groupId) => {
		ensureUserGroupExistsInternal(
			db,
			groupId,
		);
	});
}

// Collect a de-duplicated media union for the merge target and all source Groups.
function collectMergeMediaIds(db: Database, targetGroupId: number, sourceGroupIds: number[]): number[] {
	return [
		targetGroupId,
		...sourceGroupIds,
	]
		.flatMap((groupId) => selectUserGroupMediaIdsInternal(
			db,
			groupId,
		))
		.filter((mediaId, index, allMediaIds) => allMediaIds.indexOf(mediaId) === index);
}

function mergeUserGroupsIntoTargetInternal(db: Database, targetGroupId: number, sourceGroupIds: number[]): GroupingMutationImpactDto {
	const normalizedSourceGroupIds = [ ...new Set(sourceGroupIds.filter(sourceGroupId => sourceGroupId !== targetGroupId)) ];
	if (normalizedSourceGroupIds.length === 0) {
		return {
			affectedMediaIds: [],
			affectedGroupIds: [ targetGroupId ],
		};
	}

	const touchedGroupIds = [
		targetGroupId,
		...normalizedSourceGroupIds,
	];
	assertMergeGroupsExist(
		db,
		touchedGroupIds,
	);
	const lineageBaseMediaIdsBeforeMutation = selectLineageBaseMediaIdsByUserGroupIdsInternal(
		db,
		touchedGroupIds,
	);
	const mediaIdsToMerge                   = collectMergeMediaIds(
		db,
		targetGroupId,
		normalizedSourceGroupIds,
	);

	assignMediasToUserGroupInternal(
		db,
		targetGroupId,
		mediaIdsToMerge,
	);

	normalizedSourceGroupIds.forEach((sourceGroupId) => {
		deleteUserGroupContainerInternal(
			db,
			sourceGroupId,
		);
	});

	syncLineageForAnimeBaseMediaIdsInternal(
		db,
		[
			...lineageBaseMediaIdsBeforeMutation,
			...mediaIdsToMerge,
		],
	);

	return {
		affectedMediaIds: mediaIdsToMerge,
		affectedGroupIds: [
			targetGroupId,
			...normalizedSourceGroupIds,
		],
	};
}

export function mergeUserGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): GroupingMutationImpactDto {
	const db                              = getDatabase();
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: [],
		affectedGroupIds: [ targetGroupId ],
	};

	db.transaction(() => {
		result = mergeUserGroupsIntoTargetInternal(
			db,
			targetGroupId,
			sourceGroupIds,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("mergeGroupsIntoTarget");

	return result;
}

export {
	mergeUserGroupsIntoTargetInternal,
};
