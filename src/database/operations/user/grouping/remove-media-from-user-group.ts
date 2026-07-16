import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import {
	deleteUserGroupContainerInternal,
	ensureUserGroupExistsInternal,
	moveUserGroupBaseMediaIdInternal,
	removeMediaFromUserGroupInternal,
	selectAvailableReplacementBaseMediaIdInternal,
	selectLineageBaseMediaIdsByUserGroupIdsInternal,
	selectUserGroupMediaIdsInternal,
	syncLineageForAnimeBaseMediaIdsInternal,
} from "./grouping-mutation-internals";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Remove one media membership from the forked installation-owned grouping snapshot.
//
// Behavioral rules:
// - the media itself stays in Nimlat and may become orphaned
// - empty Group containers are deleted automatically
// - if the removed media was the Group base, a new deterministic base is chosen without
//   overwriting currently visible user-custom Group metadata
function removeMediaFromUserGroupInternalWithImpact(
	db: Database,
	groupId: number,
	mediaId: number,
): GroupingMutationImpactDto {
	const affectedGroupIds = new Set<number>([ groupId ]);

	const group                             = ensureUserGroupExistsInternal(
		db,
		groupId,
	);
	const lineageBaseMediaIdsBeforeMutation = selectLineageBaseMediaIdsByUserGroupIdsInternal(
		db,
		[ groupId ],
	);
	const mediaIdsBeforeMutation            = selectUserGroupMediaIdsInternal(
		db,
		groupId,
	);
	const hasMembershgroup                  = mediaIdsBeforeMutation.includes(mediaId);
	if (!hasMembershgroup) {
		return {
			affectedMediaIds: [],
			affectedGroupIds: [ groupId ],
		};
	}

	if (typeof group.baseMediaId !== "number") {
		throw new Error(`Cannot remove media from Group ${ groupId } because it has no base media id.`);
	}

	const wouldBecomeEmpty      = mediaIdsBeforeMutation.length === 1;
	const currentBaseMediaId    = group.baseMediaId;
	const isRemovingCurrentBase = currentBaseMediaId === mediaId;
	const needsReplacementBase  = isRemovingCurrentBase && !wouldBecomeEmpty;
	const nextBaseMediaId       = needsReplacementBase
		? selectAvailableReplacementBaseMediaIdInternal(
			db,
			groupId,
			mediaId,
		)
		: undefined;

	if (needsReplacementBase && typeof nextBaseMediaId !== "number") {
		throw new Error(
			`Cannot remove media ${ mediaId } from Group ${ groupId } because no remaining child media can be used as a unique replacement base`,
		);
	}

	removeMediaFromUserGroupInternal(
		db,
		groupId,
		mediaId,
	);

	if (wouldBecomeEmpty) {
		deleteUserGroupContainerInternal(
			db,
			groupId,
		);
	} else if (typeof nextBaseMediaId === "number") {
		moveUserGroupBaseMediaIdInternal(
			db,
			groupId,
			currentBaseMediaId,
			nextBaseMediaId,
		);
	}

	syncLineageForAnimeBaseMediaIdsInternal(
		db,
		[
			...lineageBaseMediaIdsBeforeMutation,
			mediaId,
			currentBaseMediaId,
			...(typeof nextBaseMediaId === "number"
				? [ nextBaseMediaId ]
				: []),
		],
	);

	return {
		affectedMediaIds: [ mediaId ],
		affectedGroupIds: [ ...affectedGroupIds ],
	};
}

export function removeMediaFromUserGroup(groupId: number, mediaId: number): GroupingMutationImpactDto {
	const db                              = getDatabase();
	let result: GroupingMutationImpactDto = {
		affectedMediaIds: [],
		affectedGroupIds: [ groupId ],
	};

	db.transaction(() => {
		result = removeMediaFromUserGroupInternalWithImpact(
			db,
			groupId,
			mediaId,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("removeMediaFromGroup");

	return result;
}

export {
	removeMediaFromUserGroupInternalWithImpact,
};
