import { createSearchKey } from "@nimlat/functions";
import {
	UserGroupBlueprintDto,
	UserGroupLineageDto,
	UserGroupMediaLinkDto,
} from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { ensureCanonicalGroupLineageByBaseMediaId } from "../../anime/canonical/canonical-id-resolution";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Remove the entire forked grouping snapshot from user_data.
// This is the low-level primitive future reset flows call before switching
// grouping mode back to anime defaults.
export function clearUserGroupingSnapshot(): void {
	const db = getDatabase();

	db.transaction(() => {
		db.prepare(`DELETE FROM userGroupMedias`).run();
		db.prepare(`DELETE FROM userGroupStates`).run();
		db.prepare(`DELETE FROM userGroupIntegrationSnapshots`).run();
		db.prepare(`DELETE FROM userAnimeGroupStates`).run();
		db.prepare(`DELETE FROM userAnimeGroupIntegrationSnapshots`).run();
		db.prepare(`DELETE FROM userCustomGroupStates`).run();
		db.prepare(`DELETE FROM userCustomGroupIntegrationSnapshots`).run();
		db.prepare(`DELETE FROM userGroupLineages`).run();
		db.prepare(`DELETE FROM userGroups`).run();
	})();
}

// Insert one user-owned Group row in the forked grouping snapshot.
// The caller must provide the chosen base Media identity explicitly.
// The internal variant exists so larger grouping mutations can keep delete/create work in one transaction.
export function createUserGroupInternal(db: ReturnType<typeof getDatabase>, group: Omit<UserGroupBlueprintDto, "id">): number {
	const baseMediaId    = group.baseMediaId;
	const groupLineageId = ensureCanonicalGroupLineageByBaseMediaId(
		db,
		baseMediaId,
	);

	// noinspection SqlResolve
	return db.prepare(`
      INSERT INTO userGroups (groupLineageId,
                              baseMediaId,
                              name,
                              nameSearchKey,
                              description,
                              imageUrl,
                              isUserCreated,
                              createdAt,
                              updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
		.run(
			groupLineageId,
			baseMediaId,
			group.name,
			createSearchKey(group.name),
			group.description ?? null,
			group.imageUrl ?? null,
			group.isUserCreated,
			group.createdAt,
			group.updatedAt,
		).lastInsertRowid as number;
}

export function createUserGroup(group: Omit<UserGroupBlueprintDto, "id">): number {
	const db = getDatabase();
	let createdGroupId = 0;

	db.transaction(() => {
		createdGroupId = createUserGroupInternal(
			db,
			group,
		);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("createGroup");

	return createdGroupId;
}

// Insert or keep one Media membership inside a forked user-owned Group.
// Membership is keyed by canonical internal media identity so future provider
// swaps or AnimeDB rebuilds do not leak provider ids into user_data mutations.
export function assignMediasToUserGroup(groupId: number, mediaIds: number[]): void {
	if (mediaIds.length === 0) {
		return;
	}

	const db                  = getDatabase();
	// noinspection SqlResolve
	const insertMembershgroup = db.prepare(`
      INSERT OR IGNORE INTO userGroupMedias (groupId, mediaId)
      VALUES (?, ?)
	`);

	db.transaction((rows: UserGroupMediaLinkDto[]) => {
		rows.forEach((row) => {
			insertMembershgroup.run(
				row.groupId,
				row.mediaId,
			);
		});
	})(
		mediaIds.map((mediaId) => ({
			groupId,
			mediaId: mediaId,
		})));
}

// Persist one upstream-lineage mapping for the forked grouping snapshot.
// The DTO carries the base-media anchor seen during reconcile; persistence must
// resolve it through groupLineages.baseMediaId so future lineage IDs can diverge
// from base media IDs without corrupting userGroupLineages.
export function saveUserGroupLineage(lineage: UserGroupLineageDto): void {
	const db                  = getDatabase();
	// noinspection SqlResolve
	const canonicalLineageRow = db.prepare(`
      SELECT groupLineageId
      FROM anime_data.groupLineages
      WHERE baseMediaId = ?
	`).get(lineage.animeBaseMediaId) as { groupLineageId?: number } | undefined;
	const groupLineageId      = typeof canonicalLineageRow?.groupLineageId === "number"
		? canonicalLineageRow.groupLineageId
		: ensureCanonicalGroupLineageByBaseMediaId(
			db,
			lineage.animeBaseMediaId,
		);

	db.transaction(() => {
		// noinspection SqlResolve
		db.prepare(`
        INSERT INTO userGroupLineages (groupLineageId,
                                       userGroupId,
                                       status,
                                       firstSeenAnimeDbVersion,
                                       lastSeenAnimeDbVersion,
                                       lastAutoImportedAt,
                                       lastUserModifiedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(groupLineageId) DO UPDATE SET userGroupId             = excluded.userGroupId,
                                                  status                  = excluded.status,
                                                  firstSeenAnimeDbVersion = excluded.firstSeenAnimeDbVersion,
                                                  lastSeenAnimeDbVersion  = excluded.lastSeenAnimeDbVersion,
                                                  lastAutoImportedAt      = excluded.lastAutoImportedAt,
                                                  lastUserModifiedAt      = excluded.lastUserModifiedAt
		`)
			.run(
				groupLineageId,
				lineage.userGroupId ?? null,
				lineage.status,
				lineage.firstSeenAnimeDbVersion ?? null,
				lineage.lastSeenAnimeDbVersion ?? null,
				lineage.lastAutoImportedAt ?? null,
				lineage.lastUserModifiedAt ?? null,
			);
	})();
}
