import { Database } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { getConfigAnimeDbVersion } from "../config/anime-db-version";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";

// Materialize the current anime-mode grouping into user-owned tables and switch
// grouping mode to `user` in one transaction.
//
// Important invariants:
// - `userGroups.id` intentionally mirrors `anime_data.groups.id` during the initial fork so
//   active renderer routes and mutation targets remain stable.
// - visible metadata is copied after anime-mode Group overrides are applied, because the fork
//   must preserve what the user currently sees.
export function forkAnimeGroupingToUserSnapshotInternal(db: Database): void {
	const now            = Date.now();
	const animeDbVersion = getConfigAnimeDbVersion() ?? null;

	// noinspection SqlResolve
	db.prepare(`DELETE FROM userGroupMedias`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userGroupStates`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userGroupIntegrationSnapshots`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userAnimeGroupStates`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userAnimeGroupIntegrationSnapshots`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userCustomGroupStates`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userCustomGroupIntegrationSnapshots`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userGroupLineages`).run();
	// noinspection SqlResolve
	db.prepare(`DELETE FROM userGroups`).run();

	// noinspection SqlResolve
	db.prepare(`
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
      SELECT groups.id,
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
	`).run(
		now,
		now,
	);

	// noinspection SqlResolve
	db.prepare(`
      INSERT INTO userGroupMedias (groupId, mediaId)
      SELECT groupId, mediaId
      FROM anime_data.groupMedia
	`).run();

	// noinspection SqlResolve
	db.prepare(`
      INSERT INTO userGroupLineages (groupLineageId,
                                     userGroupId,
                                     status,
                                     firstSeenAnimeDbVersion,
                                     lastSeenAnimeDbVersion,
                                     lastAutoImportedAt,
                                     lastUserModifiedAt)
      SELECT groupLineages.groupLineageId,
             groups.id,
             'active',
             ?,
             ?,
             ?,
             NULL
      FROM anime_data.groupLineages groupLineages
               JOIN anime_data.groups groups
                    ON groups.groupLineageId = groupLineages.groupLineageId
	`).run(
		animeDbVersion,
		animeDbVersion,
		now,
	);

	// noinspection SqlResolve
	db.prepare(`
      INSERT INTO userGroupingState (id,
                                     groupingMode,
                                     forkedFromAnimeDbVersion,
                                     lastReconciledAnimeDbVersion,
                                     lastReconciledAt,
                                     lastReconcileStatus,
                                     lastReconcileSummaryJson)
      VALUES (1, 'user', ?, NULL, NULL, NULL, NULL)
      ON CONFLICT(id) DO UPDATE SET groupingMode             = 'user',
                                    forkedFromAnimeDbVersion = excluded.forkedFromAnimeDbVersion
	`).run(animeDbVersion);
}

export function forkAnimeGroupingToUserSnapshot(): void {
	const db = getDatabase();

	db.transaction(() => {
		forkAnimeGroupingToUserSnapshotInternal(db);
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("forkAnimeGroupingToSnapshot");
}
