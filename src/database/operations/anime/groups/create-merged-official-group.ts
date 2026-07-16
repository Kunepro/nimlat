import {
	CreateMergedUserGroupResultDto,
	GroupBlueprintDto,
} from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { _assignMediasToGroup } from "./assign-medias-to-group";
import { _insertGroup } from "./create-group/internal/_insert-group";

type MediaIdRow = {
	mediaId: number;
};

function normalizeIds(ids: number[]): number[] {
	return Array.from(new Set(ids.filter(id => Number.isInteger(id))));
}

function selectMediaIdsForGroups(db: Database, groupIds: number[]): number[] {
	if (groupIds.length === 0) {
		return [];
	}

	const placeholders = groupIds.map(() => "?").join(", ");
	// noinspection SqlResolve
	return (db.prepare(`
      SELECT mediaId
      FROM anime_data.groupMedia
      WHERE groupId IN (${ placeholders })
      ORDER BY mediaId ASC
	`).all(...groupIds) as MediaIdRow[])
		.map(row => row.mediaId);
}

function deleteOfficialGroupsInternal(db: Database, groupIds: number[]): void {
	if (groupIds.length === 0) {
		return;
	}

	const placeholders = groupIds.map(() => "?").join(", ");
	// noinspection SqlResolve
	db.prepare(`
      DELETE
      FROM anime_data.groupMedia
      WHERE groupId IN (${ placeholders })
	`).run(...groupIds);
	// noinspection SqlResolve
	db.prepare(`
      DELETE
      FROM anime_data.groups
      WHERE id IN (${ placeholders })
	`).run(...groupIds);
}

// Build a replacement official Group in one transaction so admin review edits can
// free source base-media anchors before inserting the curated row.
export function createMergedOfficialGroup(
	group: Omit<GroupBlueprintDto, "id">,
	sourceGroupIds: number[],
	mediaIds: number[],
): CreateMergedUserGroupResultDto {
	const db = getDatabase();

	return db.transaction(() => {
		const normalizedSourceGroupIds = normalizeIds(sourceGroupIds);
		const affectedMediaIds         = normalizeIds([
			...selectMediaIdsForGroups(
				db,
				normalizedSourceGroupIds,
			),
			...mediaIds,
		]);

		deleteOfficialGroupsInternal(
			db,
			normalizedSourceGroupIds,
		);
		const createdGroupId = _insertGroup(
			db,
			group,
		);
		_assignMediasToGroup(
			db,
			createdGroupId,
			affectedMediaIds,
			true,
		);

		return {
			createdGroupId,
			affectedMediaIds,
			affectedGroupIds: [
				createdGroupId,
				...normalizedSourceGroupIds,
			],
		};
	})();
}
