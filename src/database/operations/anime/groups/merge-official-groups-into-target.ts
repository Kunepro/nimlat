import { GroupingMutationImpactDto } from "@nimlat/types/anime-db";
import type { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { _assignMediasToGroup } from "./assign-medias-to-group";

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

function ensureTargetGroupExists(db: Database, targetGroupId: number): void {
	// noinspection SqlResolve
	const row = db.prepare(`
        SELECT id
        FROM anime_data.groups
        WHERE id = ?
	`).get(targetGroupId);

	if (!row) {
		throw new Error(`Official Group with ID ${ targetGroupId } does not exist`);
	}
}

function deleteSourceGroups(db: Database, sourceGroupIds: number[]): void {
	if (sourceGroupIds.length === 0) {
		return;
	}

	const placeholders = sourceGroupIds.map(() => "?").join(", ");
	// noinspection SqlResolve
	db.prepare(`
        DELETE
        FROM anime_data.groupMedia
        WHERE groupId IN (${ placeholders })
	`).run(...sourceGroupIds);
	// noinspection SqlResolve
	db.prepare(`
        DELETE
        FROM anime_data.groups
        WHERE id IN (${ placeholders })
	`).run(...sourceGroupIds);
}

// Merge source official Groups into a target as an admin curation write. Source
// rows are removed only inside the same transaction that adds their media to target.
export function mergeOfficialGroupsIntoTarget(targetGroupId: number, sourceGroupIds: number[]): GroupingMutationImpactDto {
	const db = getDatabase();

	return db.transaction(() => {
		const normalizedSourceGroupIds = normalizeIds(sourceGroupIds)
			.filter(groupId => groupId !== targetGroupId);
		ensureTargetGroupExists(
			db,
			targetGroupId,
		);

		const affectedMediaIds = normalizeIds(selectMediaIdsForGroups(
			db,
			[
				targetGroupId,
				...normalizedSourceGroupIds,
			],
		));
		_assignMediasToGroup(
			db,
			targetGroupId,
			affectedMediaIds,
			true,
		);
		deleteSourceGroups(
			db,
			normalizedSourceGroupIds,
		);

		return {
			affectedMediaIds,
			affectedGroupIds: [
				targetGroupId,
				...normalizedSourceGroupIds,
			],
		};
	})();
}
