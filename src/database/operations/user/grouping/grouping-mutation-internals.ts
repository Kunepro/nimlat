import type { Database } from "better-sqlite3";
import { ensureCanonicalGroupLineageByBaseMediaId } from "../../anime/canonical/canonical-id-resolution";

type UserGroupIdentityRow = {
	id: number;
	groupLineageId: number | null;
	baseMediaId: number | null;
};

type UserGroupLineageRow = {
	groupLineageId: number;
};

type GroupLineageBaseMediaRow = {
	baseMediaId: number | null;
};

type GroupLineageIdentityRow = {
	groupLineageId: number;
};

// Shared primitives for user-mode Group membership mutations.
// Canonical rules:
// - userGroups/userGroupMedias/userGroupLineages own the forked snapshot;
// - groupLineageId is the stable reconcile/import identity;
// - baseMediaId is only the current display/business anchor and may change without
//   changing lineage ownership.
export function ensureUserGroupExistsInternal(db: Database, groupId: number): UserGroupIdentityRow {
	// noinspection SqlResolve
	const row = db.prepare(`
    SELECT
        userGroups.id,
        userGroups.groupLineageId,
        userGroups.baseMediaId
    FROM userGroups
    WHERE userGroups.id = ?
	`).get(groupId) as UserGroupIdentityRow | undefined;

	if (!row) {
		throw new Error(`User Group with ID ${ groupId } does not exist`);
	}

	return row;
}

export function selectUserGroupMediaIdsInternal(db: Database, groupId: number): number[] {
	// noinspection SqlResolve
	return (db.prepare(`
    SELECT media.mediaId AS mediaId
    FROM userGroupMedias
    JOIN anime_data.media media
         ON media.mediaId = userGroupMedias.mediaId
    WHERE userGroupMedias.groupId = ?
    ORDER BY media.mediaId ASC
	`).all(groupId) as Array<{ mediaId: number }>)
		.map((row) => row.mediaId);
}

// Return canonical official lineage IDs represented by the supplied user Groups.
export function selectLineageBaseMediaIdsByUserGroupIdsInternal(db: Database, groupIds: number[]): number[] {
	const normalizedGroupIds = [ ...new Set(groupIds.filter(groupId => Number.isInteger(groupId))) ];
	if (normalizedGroupIds.length === 0) {
		return [];
	}

	const placeholders = normalizedGroupIds.map(() => "?").join(", ");
	// noinspection SqlResolve
	return (db.prepare(`
    SELECT groupLineageId
    FROM userGroupLineages
    WHERE userGroupId IN (${ placeholders })
	`).all(...normalizedGroupIds) as UserGroupLineageRow[])
		.map((row) => row.groupLineageId);
}

// Pick the lowest eligible replacement anchor after the current Group base is
// removed. It must remain a member and cannot be another Group's visible base
// because userGroups.baseMediaId is globally unique within user_data.
export function selectAvailableReplacementBaseMediaIdInternal(
	db: Database,
	groupId: number,
	removedMediaId: number,
): number | undefined {
	// noinspection SqlResolve
	const row = db.prepare(`
    SELECT media.mediaId AS mediaId
    FROM userGroupMedias
    JOIN anime_data.media media
         ON media.mediaId = userGroupMedias.mediaId
    WHERE userGroupMedias.groupId = ?
      AND userGroupMedias.mediaId <> ?
      AND NOT EXISTS(
          SELECT 1
          FROM userGroups conflictingGroup
          WHERE conflictingGroup.baseMediaId = userGroupMedias.mediaId
            AND conflictingGroup.id <> ?
      )
    ORDER BY media.mediaId ASC
    LIMIT 1
	`).get(
		groupId,
		removedMediaId,
		groupId,
	) as { mediaId: number } | undefined;

	return typeof row?.mediaId === "number"
		? row.mediaId
		: undefined;
}

// Pick the first candidate that satisfies the global baseMediaId uniqueness rule.
// excludedGroupIds models containers the same transaction will delete/replace, so
// their current anchors do not create false conflicts.
export function selectAvailableBaseMediaIdForNewGroupInternal(
	db: Database,
	candidateMediaIds: number[],
	excludedGroupIds: number[] = [],
): number | undefined {
	const normalizedCandidateMediaIds = [ ...new Set(candidateMediaIds.filter(mediaId => Number.isInteger(mediaId))) ];
	if (normalizedCandidateMediaIds.length === 0) {
		return undefined;
	}

	const normalizedExcludedGroupIds = [ ...new Set(excludedGroupIds.filter(groupId => Number.isInteger(groupId))) ];
	const conflictCheck = normalizedExcludedGroupIds.length === 0
		? db.prepare(`
      SELECT 1
      FROM userGroups
      WHERE baseMediaId = ?
      LIMIT 1
		`)
		: db.prepare(`
      SELECT 1
      FROM userGroups
      WHERE baseMediaId = ?
        AND id NOT IN (${ normalizedExcludedGroupIds.map(() => "?").join(", ") })
      LIMIT 1
		`);

	for (const candidateMediaId of normalizedCandidateMediaIds) {
		const conflict = normalizedExcludedGroupIds.length === 0
			? conflictCheck.get(candidateMediaId)
			: conflictCheck.get(
				candidateMediaId,
				...normalizedExcludedGroupIds,
			);
		if (!conflict) {
			return candidateMediaId;
		}
	}

	return undefined;
}

// Move only the mutable display/business anchor; lineage identity and user-edited
// Group metadata remain untouched.
export function moveUserGroupBaseMediaIdInternal(
	db: Database,
	groupId: number,
	previousBaseMediaId: number,
	nextBaseMediaId: number,
): void {
	if (previousBaseMediaId === nextBaseMediaId) {
		return;
	}

	// noinspection SqlResolve
	db.prepare(`
      UPDATE userGroups
      SET baseMediaId = ?,
          updatedAt   = ?
      WHERE id = ?
	`).run(
		nextBaseMediaId,
		Date.now(),
		groupId,
	);
}

export function removeMediaFromUserGroupInternal(db: Database, groupId: number, mediaId: number): void {
	// noinspection SqlResolve
	db.prepare(`
    DELETE
    FROM userGroupMedias
    WHERE groupId = ?
      AND mediaId = ?
	`).run(
		groupId,
		mediaId,
	);
}

export function deleteUserGroupContainerInternal(db: Database, groupId: number): void {
	// noinspection SqlResolve
	db.prepare(`
    DELETE
    FROM userGroups
    WHERE id = ?
	`).run(groupId);
}

// Resolve the current owner of an official lineage after mutation. Preserve an
// exact primary-lineage owner when possible; otherwise choose the lowest Group ID
// containing the lineage's base media for deterministic reconciliation.
function resolveOwningUserGroupIdForLineageInternal(db: Database, groupLineageId: number): number | undefined {
	// noinspection SqlResolve
	const exactPrimaryMatch = db.prepare(`
    SELECT id
    FROM userGroups
    WHERE groupLineageId = ?
	`).get(groupLineageId) as { id: number } | undefined;

	if (typeof exactPrimaryMatch?.id === "number") {
		return exactPrimaryMatch.id;
	}

	// noinspection SqlResolve
	const lineageBaseMediaRow = db.prepare(`
    SELECT baseMediaId
    FROM anime_data.groupLineages
    WHERE groupLineageId = ?
	`).get(groupLineageId) as GroupLineageBaseMediaRow | undefined;
	if (typeof lineageBaseMediaRow?.baseMediaId !== "number") {
		return undefined;
	}

	// noinspection SqlResolve
	const membershgroupMatch = db.prepare(`
    SELECT groupId AS id
    FROM userGroupMedias
    WHERE mediaId = ?
    ORDER BY groupId ASC
    LIMIT 1
	`).get(lineageBaseMediaRow.baseMediaId) as { id: number } | undefined;

	return typeof membershgroupMatch?.id === "number"
		? membershgroupMatch.id
		: undefined;
}

function resolveCanonicalGroupLineageIdFromCompatibilityKeyInternal(db: Database, lineageKey: number): number {
	// noinspection SqlResolve
	const existingCanonicalLineage = db.prepare(`
    SELECT groupLineageId
    FROM anime_data.groupLineages
    WHERE groupLineageId = ?
	`).get(lineageKey) as GroupLineageIdentityRow | undefined;
	if (typeof existingCanonicalLineage?.groupLineageId === "number") {
		return existingCanonicalLineage.groupLineageId;
	}

	return ensureCanonicalGroupLineageByBaseMediaId(
		db,
		lineageKey,
	);
}

// Re-resolve existing official lineage rows after a user grouping mutation. Never
// create an official lineage for a user-only Group: retarget the known row to its
// deterministic owner or tombstone it when no current Group can carry it.
export function syncLineageForAnimeBaseMediaIdsInternal(
	db: Database,
	animeBaseMediaIds: number[],
): void {
	const normalizedLineageKeys = [ ...new Set(animeBaseMediaIds.filter(id => Number.isInteger(id))) ];
	if (normalizedLineageKeys.length === 0) {
		return;
	}

	const now           = Date.now();
	// noinspection SqlResolve
	const selectLineage = db.prepare(`
    SELECT groupLineageId
    FROM userGroupLineages
    WHERE groupLineageId = ?
	`);
	// noinspection SqlResolve
	const updateLineage = db.prepare(`
      UPDATE userGroupLineages
      SET userGroupId        = ?,
          status             = ?,
          lastUserModifiedAt = ?
      WHERE groupLineageId = ?
	`);

	for (const lineageKey of normalizedLineageKeys) {
		const groupLineageId  = resolveCanonicalGroupLineageIdFromCompatibilityKeyInternal(
			db,
			lineageKey,
		);
		const existingLineage = selectLineage.get(groupLineageId) as { groupLineageId: number } | undefined;
		if (!existingLineage) {
			continue;
		}

		const resolvedUserGroupId = resolveOwningUserGroupIdForLineageInternal(
			db,
			groupLineageId,
		);

		updateLineage.run(
			resolvedUserGroupId ?? null,
			resolvedUserGroupId ? "active" : "deleted",
			now,
			groupLineageId,
		);
	}
}
