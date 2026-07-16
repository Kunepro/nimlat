import type { Database } from "better-sqlite3";
import { assignMediasToUserGroupInternal } from "../assign-medias-to-user-group";

interface ImportedGroupLineageResult {
	groupId: number;
	importedMediaIds: number[];
}

interface AnimeGroupIdentityRow {
	animeGroupId: number;
}

/**
 * Materialize the current anime_data representation of one official lineage into the user snapshot.
 *
 * This helper is shared by safe reconcile apply and manual repair tools so they import
 * upstream groups with identical metadata, id-preference, and lineage-upsert rules.
 */
export function importAnimeGroupLineageIntoUserSnapshotInternal(
	db: Database,
	params: {
		groupLineageId: number;
		toAnimeDbVersion: string;
		now: number;
	},
): ImportedGroupLineageResult {
	// noinspection SqlResolve
	const animeGroupIdentityRow = db.prepare<[ number ], AnimeGroupIdentityRow>(`
        SELECT id AS animeGroupId
        FROM anime_data.groups
        WHERE groupLineageId = ?
        LIMIT 1
	`).get(params.groupLineageId);
	if (typeof animeGroupIdentityRow?.animeGroupId !== "number") {
		throw new Error(`Cannot import lineage ${ params.groupLineageId } because the upstream group row is missing.`);
	}

	// noinspection SqlResolve
	const existingCollision = db.prepare<[ number ], { id: number }>(`
        SELECT id
        FROM userGroups
        WHERE groupLineageId = ?
        LIMIT 1
	`).get(params.groupLineageId);
	if (typeof existingCollision?.id === "number") {
		throw new Error(`Cannot import lineage ${ params.groupLineageId } because user group ${ existingCollision.id } already owns that lineage identity.`);
	}

	// noinspection SqlResolve
	const preferredIdRow    = db.prepare<[ number ], { id: number }>(`
        SELECT id
        FROM userGroups
        WHERE id = ?
	`).get(animeGroupIdentityRow.animeGroupId);
	const preferredGroupIdAvailable = preferredIdRow == null;

	// Keep untouched imported lineages on the upstream group id when that slot is free.
	// This preserves stable inspection/navigation ids for ordinary official groups.
	// noinspection SqlResolve
	const insertGroupWithPreferredId = db.prepare<[ number, number, number, number ]>(`
        INSERT INTO userGroups (id,
                                groupLineageId,
                                baseMediaId,
	                                name,
	                                nameSearchKey,
	                                description,
                                imageUrl,
                                isUserCreated,
                                createdAt,
                                updatedAt)
        SELECT ?,
               groups.groupLineageId,
               groupLineages.baseMediaId,
	               COALESCE(userGroupOverrides.name, groups.name),
	               COALESCE(userGroupOverrides.nameSearchKey, groups.nameSearchKey),
	               COALESCE(userGroupOverrides.description, groups.description),
               groups.imageUrl,
               0,
               ?,
               ?
        FROM anime_data.groups groups
                 JOIN anime_data.groupLineages groupLineages
                      ON groupLineages.groupLineageId = groups.groupLineageId
                 LEFT JOIN userGroupOverrides
                           ON userGroupOverrides.animeGroupId = groups.id
        WHERE groups.groupLineageId = ?
	`);
	// noinspection SqlResolve
	const insertGroupAutoId = db.prepare<[ number, number, number ]>(`
        INSERT INTO userGroups (groupLineageId,
                                baseMediaId,
	                                name,
	                                nameSearchKey,
	                                description,
                                imageUrl,
                                isUserCreated,
                                createdAt,
                                updatedAt)
        SELECT groups.groupLineageId,
               groupLineages.baseMediaId,
	               COALESCE(userGroupOverrides.name, groups.name),
	               COALESCE(userGroupOverrides.nameSearchKey, groups.nameSearchKey),
	               COALESCE(userGroupOverrides.description, groups.description),
               groups.imageUrl,
               0,
               ?,
               ?
        FROM anime_data.groups groups
                 JOIN anime_data.groupLineages groupLineages
                      ON groupLineages.groupLineageId = groups.groupLineageId
                 LEFT JOIN userGroupOverrides
                           ON userGroupOverrides.animeGroupId = groups.id
        WHERE groups.groupLineageId = ?
	`);

	const insertResult = preferredGroupIdAvailable
		? insertGroupWithPreferredId.run(
			animeGroupIdentityRow.animeGroupId,
			params.now,
			params.now,
			params.groupLineageId,
		)
		: insertGroupAutoId.run(
			params.now,
			params.now,
			params.groupLineageId,
		);
	if (insertResult.changes !== 1) {
		throw new Error(`Cannot import lineage ${ params.groupLineageId } because the upstream group row is not available.`);
	}

	const createdGroupId = preferredGroupIdAvailable
		? animeGroupIdentityRow.animeGroupId
		: insertResult.lastInsertRowid as number;

	// noinspection SqlResolve
	const animeGroupMediaRows = db.prepare<[ number ], { mediaId: number }>(`
        SELECT groupMedia.mediaId
        FROM anime_data.groupMedia groupMedia
                 JOIN anime_data.groups groups
                      ON groups.id = groupMedia.groupId
        WHERE groups.groupLineageId = ?
        ORDER BY groupMedia.mediaId
	`).all(params.groupLineageId);
	const importedMediaIds  = animeGroupMediaRows.map(row => row.mediaId);

	assignMediasToUserGroupInternal(
		db,
		createdGroupId,
		importedMediaIds,
	);

	// noinspection SqlResolve
	db.prepare<[ number, number, string, string, number ]>(`
        INSERT INTO userGroupLineages (groupLineageId,
                                       userGroupId,
                                       status,
                                       firstSeenAnimeDbVersion,
                                       lastSeenAnimeDbVersion,
                                       lastAutoImportedAt,
                                       lastUserModifiedAt)
        VALUES (?, ?, 'active', ?, ?, ?, NULL)
        ON CONFLICT(groupLineageId)
            DO UPDATE SET userGroupId             = excluded.userGroupId,
                          status                  = 'active',
                          firstSeenAnimeDbVersion = COALESCE(userGroupLineages.firstSeenAnimeDbVersion,
                                                             excluded.firstSeenAnimeDbVersion),
                          lastSeenAnimeDbVersion  = excluded.lastSeenAnimeDbVersion,
                          lastAutoImportedAt      = excluded.lastAutoImportedAt,
                          lastUserModifiedAt      = NULL
	`).run(
		params.groupLineageId,
		createdGroupId,
		params.toAnimeDbVersion,
		params.toAnimeDbVersion,
		params.now,
	);

	return {
		groupId: createdGroupId,
		importedMediaIds,
	};
}
