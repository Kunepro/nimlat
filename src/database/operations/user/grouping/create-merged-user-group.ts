import {
	CreateMergedUserGroupResultDto,
	UserGroupBlueprintDto,
} from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { assignMediasToUserGroupInternal } from "./assign-medias-to-user-group";
import {
	deleteUserGroupContainerInternal,
	ensureUserGroupExistsInternal,
	selectAvailableBaseMediaIdForNewGroupInternal,
	selectLineageBaseMediaIdsByUserGroupIdsInternal,
	syncLineageForAnimeBaseMediaIdsInternal,
} from "./grouping-mutation-internals";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";
import { createUserGroupInternal } from "./user-grouping-snapshot";

function createMergedUserGroupInternal(
	db: Database,
	group: Omit<UserGroupBlueprintDto, "id">,
	sourceGroupIds: number[],
	mediaIds: number[],
): CreateMergedUserGroupResultDto {
	const normalizedSourceGroupIds = [ ...new Set(sourceGroupIds.filter(groupId => Number.isInteger(groupId))) ];
	const normalizedMediaIds  = [ ...new Set(mediaIds.filter(mediaId => Number.isInteger(mediaId))) ];
	if (normalizedSourceGroupIds.length === 0) {
		throw new Error("Select at least one source group to merge.");
	}
	if (normalizedMediaIds.length === 0) {
		throw new Error("Select at least one media or group first.");
	}

	normalizedSourceGroupIds.forEach((groupId) => {
		ensureUserGroupExistsInternal(
			db,
			groupId,
		);
	});

	const lineageBaseMediaIdsBeforeMutation = selectLineageBaseMediaIdsByUserGroupIdsInternal(
		db,
		normalizedSourceGroupIds,
	);
	const resolvedBaseMediaId = selectAvailableBaseMediaIdForNewGroupInternal(
		db,
		[
			group.baseMediaId,
			...normalizedMediaIds,
		],
		normalizedSourceGroupIds,
	);
	if (typeof resolvedBaseMediaId !== "number") {
		throw new Error("Cannot create the merged group because every selected media is already used as another group anchor.");
	}

	normalizedSourceGroupIds.forEach((groupId) => {
		deleteUserGroupContainerInternal(
			db,
			groupId,
		);
	});

	const createdGroupId = createUserGroupInternal(
		db,
		{
			...group,
			baseMediaId: resolvedBaseMediaId,
		},
	);

	assignMediasToUserGroupInternal(
		db,
		createdGroupId,
		normalizedMediaIds,
	);

	syncLineageForAnimeBaseMediaIdsInternal(
		db,
		[
			...lineageBaseMediaIdsBeforeMutation,
			...normalizedMediaIds,
		],
	);

	return {
		createdGroupId,
		affectedMediaIds: normalizedMediaIds,
		affectedGroupIds: [
			createdGroupId,
			...normalizedSourceGroupIds,
		],
	};
}

// Create-merged-group is atomic so source groups are not lost if the replacement insert or re-assignment fails.
export function createMergedUserGroup(
	group: Omit<UserGroupBlueprintDto, "id">,
	sourceGroupIds: number[],
	mediaIds: number[],
): CreateMergedUserGroupResultDto {
	const db                                   = getDatabase();
	let result: CreateMergedUserGroupResultDto = {
		createdGroupId: 0,
		affectedMediaIds: [],
		affectedGroupIds: [],
	};

	db.transaction(() => {
		result = createMergedUserGroupInternal(
			db,
			group,
			sourceGroupIds,
			mediaIds,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("createMergedGroup");

	return result;
}
