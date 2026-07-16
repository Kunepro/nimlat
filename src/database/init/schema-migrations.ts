import type { Database } from "better-sqlite3";

type SchemaMigrationTargetDb = "user_data" | "anime_data" | "image_data";

export interface SchemaMigration {
	readonly targetDb: SchemaMigrationTargetDb;
	readonly migrationId: string;
	readonly up: (db: Database) => void;
}

type AppliedSchemaMigrationRow = {
	targetDb: SchemaMigrationTargetDb;
	migrationId: string;
};

// Approved cleanup migrations call this only with hard-coded schema identifiers.
// Guarding each drop keeps fresh installs and partially migrated pre-release DBs
// on the same idempotent path without treating an absent legacy column as failure.
function dropColumnIfExists(db: Database, tableName: string, columnName: string): void {
	const existing = db.prepare(`
      SELECT name
      FROM pragma_table_info('${ tableName }')
      WHERE name = '${ columnName }'
	`).get() as { name: string } | undefined;
	if (existing) {
		db.exec(`ALTER TABLE ${ tableName }
        DROP COLUMN ${ columnName }`);
	}
}

const USER_DATA_SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
	{
		targetDb:    "user_data",
		migrationId: "20260719_external_tracking_public_profile_identifier",
		up:          (db) => {
			const existing = db.prepare(`
          SELECT name
          FROM pragma_table_info('externalTrackingAccounts')
          WHERE name = 'publicProfileIdentifier'
			`).get() as { name: string } | undefined;
			// Fresh databases already receive the column from the baseline schema;
			// existing user_data files add it in place without replacing account data.
			if (!existing) {
				db.exec(`
            ALTER TABLE externalTrackingAccounts
                ADD COLUMN publicProfileIdentifier TEXT
				`);
			}
		},
	},
	{
		targetDb:    "user_data",
		migrationId: "20260719_remove_external_tracking_display_name",
		up:          (db) => {
			const existing = db.prepare(`
          SELECT name
          FROM pragma_table_info('externalTrackingAccounts')
          WHERE name = 'displayName'
			`).get() as { name: string } | undefined;
			// Account labels were never used to identify provider state. Remove the
			// dead column in place while SQLite preserves every remaining account field.
			if (existing) {
				db.exec(`
            ALTER TABLE externalTrackingAccounts
                DROP COLUMN displayName
				`);
			}
		},
	},
	{
		targetDb:    "user_data",
		migrationId: "20260719_clean_external_tracking_legacy_state",
		up:          (db) => {
			const hasPendingAuthUrl = db.prepare(`
          SELECT name
          FROM pragma_table_info('externalTrackingAccounts')
          WHERE name = 'pendingAuthUrl'
			`).get() as { name: string } | undefined;
			if (hasPendingAuthUrl) {
				db.exec(`
            ALTER TABLE externalTrackingAccounts
                DROP COLUMN pendingAuthUrl
				`);
			}

			const hasLegacyProviderStates = db.prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = 'externalTrackingProviderMediaStates'
			`).get() as { name: string } | undefined;
			if (hasLegacyProviderStates) {
				// Preserve old one-shot import activity on the account before dropping
				// the duplicated per-media progress snapshot.
				db.exec(`
            INSERT INTO externalTrackingAccounts (provider,
                                                  status,
                                                  authKind,
                                                  lastImportedAt,
                                                  updatedAt)
            SELECT provider,
                   'available',
                   CASE provider
                       WHEN 'anilist' THEN 'implicit'
                       WHEN 'kitsu' THEN 'password'
                       ELSE 'pkce'
                       END,
                   MAX(lastImportedAt),
                   MAX(updatedAt)
            FROM externalTrackingProviderMediaStates
            GROUP BY provider
            HAVING MAX(lastImportedAt) IS NOT NULL
            ON CONFLICT(provider) DO UPDATE SET lastImportedAt = CASE
                                                                     WHEN
                                                                         externalTrackingAccounts.lastImportedAt IS NULL
                                                                             OR excluded.lastImportedAt >
                                                                                externalTrackingAccounts.lastImportedAt
                                                                         THEN excluded.lastImportedAt
                                                                     ELSE externalTrackingAccounts.lastImportedAt
                END,
                                                updatedAt      = MAX(externalTrackingAccounts.updatedAt, excluded.updatedAt);

            INSERT INTO externalTrackingProviderMediaMappings (provider,
                                                               mediaId,
                                                               providerMediaId)
            SELECT provider,
                   mediaId,
                   providerMediaId
            FROM externalTrackingProviderMediaStates
            WHERE providerMediaId IS NOT NULL
            ON CONFLICT(provider, mediaId) DO UPDATE SET providerMediaId = excluded.providerMediaId;

            DROP TABLE externalTrackingProviderMediaStates;
				`);
			}

			// Import outcomes already live on the provider account and in structured
			// logs; the old audit table had no reader or retention policy.
			db.exec(`DROP TABLE IF EXISTS externalTrackingImportRuns`);
		},
	},
	{
		targetDb:    "user_data",
		migrationId: "20260719_remove_unused_watched_provenance",
		up:          (db) => {
			// Imported and manual watched state now share the same local truth. Provider
			// origin and mapping timestamps had no remaining reader or lifecycle role.
			dropColumnIfExists(
				db,
				"userMediaWatchStates",
				"sourceType",
			);
			dropColumnIfExists(
				db,
				"userMediaWatchStates",
				"sourceProvider",
			);
			dropColumnIfExists(
				db,
				"userEpisodeWatchStates",
				"sourceType",
			);
			dropColumnIfExists(
				db,
				"userEpisodeWatchStates",
				"sourceProvider",
			);
			dropColumnIfExists(
				db,
				"externalTrackingProviderMediaMappings",
				"updatedAt",
			);
		},
	},
	{
		targetDb:    "user_data",
		migrationId: "20260719_clean_external_tracking_manual_actions",
		up:          (db) => {
			const hasLegacySyncQueue = db.prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = 'externalTrackingSyncQueue'
			`).get() as { name: string } | undefined;
			if (hasLegacySyncQueue) {
				// Preserve the latest unfinished provider/media identity as manual export
				// work. Target values are read from current local truth when Export runs.
				db.exec(`
            INSERT INTO externalTrackingPendingExports (provider,
                                                        mediaId,
                                                        revision,
                                                        changedAt)
            SELECT provider,
                   mediaId,
                   1,
                   MAX(updatedAt)
            FROM externalTrackingSyncQueue
            WHERE status IN ('pending', 'running', 'failed')
            GROUP BY provider, mediaId
            ON CONFLICT(provider, mediaId) DO UPDATE SET revision  = externalTrackingPendingExports.revision + 1,
                                                         changedAt = MAX(externalTrackingPendingExports.changedAt, excluded.changedAt);
				`);
			}
			// Provider updates now happen only through an explicit, awaited Export.
			// Remove automatic scheduling only after unfinished identities are durable.
			db.exec(`DROP TABLE IF EXISTS externalTrackingSyncQueue`);
			dropColumnIfExists(
				db,
				"externalTrackingAccounts",
				"lastSyncedAt",
			);
		},
	},
	{
		targetDb:    "user_data",
		migrationId: "20260719_recover_external_tracking_pending_exports",
		up:          (db) => {
			// Some local pre-release databases already ran the destructive queue
			// cleanup. Recover watch-state changes made after that migration for every
			// connected provider; older queue identities cannot be reconstructed.
			db.exec(`
          INSERT INTO externalTrackingPendingExports (provider,
                                                      mediaId,
                                                      revision,
                                                      changedAt)
          SELECT account.provider,
                 state.mediaId,
                 1,
                 state.updatedAt
          FROM externalTrackingAccounts account
                   CROSS JOIN userMediaWatchStates state
                   INNER JOIN schemaMigrations cleanup
                              ON cleanup.targetDb = 'user_data'
                                  AND cleanup.migrationId = '20260719_clean_external_tracking_manual_actions'
          WHERE account.status = 'connected'
            AND state.updatedAt >= cleanup.appliedAt
          ON CONFLICT(provider, mediaId) DO UPDATE SET revision  = externalTrackingPendingExports.revision + 1,
                                                       changedAt = MAX(externalTrackingPendingExports.changedAt, excluded.changedAt);

          DROP INDEX IF EXISTS idxUserMediaWatchStatesActiveProgress;
			`);
		},
	},
];
const ANIME_DATA_SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [];
const IMAGE_DATA_SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [];

export function initSchemaMigrationsTable(db: Database): void {
	// schemaMigrations:
	// Central user_data-owned bookkeeping for approved schema migrations. It
	// tracks migrations for all attached DBs so AnimeDB release assets do not need
	// a technical tracking table added only for local app migration state.
	// noinspection SqlResolve
	db.exec(`
        CREATE TABLE IF NOT EXISTS schemaMigrations
        (
            targetDb    TEXT    NOT NULL,
            migrationId TEXT    NOT NULL,
            appliedAt   INTEGER NOT NULL,
            PRIMARY KEY (targetDb, migrationId)
        );
	`);
}

function createMigrationKey(migration: Pick<SchemaMigration, "targetDb" | "migrationId">): string {
	return `${ migration.targetDb }:${ migration.migrationId }`;
}

function assertUniqueMigrationIds(migrations: readonly SchemaMigration[]): void {
	const seen = new Set<string>();
	migrations.forEach((migration) => {
		const key = createMigrationKey(migration);
		if (seen.has(key)) {
			throw new Error(`Duplicate schema migration id: ${ key }`);
		}
		seen.add(key);
	});
}

function readAppliedMigrations(db: Database): Set<string> {
	const rows = db
		.prepare<[], AppliedSchemaMigrationRow>(`
            SELECT targetDb, migrationId
            FROM schemaMigrations
		`)
		.all();

	return new Set(rows.map(createMigrationKey));
}

export function applyPendingSchemaMigrations(
	db: Database,
	migrations: readonly SchemaMigration[],
): void {
	initSchemaMigrationsTable(db);
	assertUniqueMigrationIds(migrations);

	const appliedMigrationKeys = readAppliedMigrations(db);
	migrations.forEach((migration) => {
		const key = createMigrationKey(migration);
		if (appliedMigrationKeys.has(key)) {
			return;
		}

		migration.up(db);
		db.prepare(`
            INSERT INTO schemaMigrations (targetDb, migrationId, appliedAt)
            VALUES (?, ?, ?)
		`).run(
			migration.targetDb,
			migration.migrationId,
			Date.now(),
		);
		appliedMigrationKeys.add(key);
	});
}

export function applyAllPendingSchemaMigrations(db: Database): void {
	applyPendingSchemaMigrations(
		db,
		[
			...USER_DATA_SCHEMA_MIGRATIONS,
			...ANIME_DATA_SCHEMA_MIGRATIONS,
			...IMAGE_DATA_SCHEMA_MIGRATIONS,
		],
	);
}
