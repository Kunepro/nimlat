// @vitest-environment node

import type { Database } from "better-sqlite3";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	applyAllPendingSchemaMigrations,
	applyPendingSchemaMigrations,
	type SchemaMigration,
} from "./schema-migrations";

type AppliedMigrationRow = {
	targetDb: string;
	migrationId: string;
};

interface FakeStatement {
	all?: () => AppliedMigrationRow[];
	get?: () => { name: string } | undefined;
	run?: (targetDb: string, migrationId: string, appliedAt: number) => void;
}

function createFakeDb(appliedRows: AppliedMigrationRow[] = []): Database {
	const db = {
		exec:    vi.fn(),
		prepare: vi.fn((sql: string): FakeStatement => {
			if (sql.includes("SELECT targetDb, migrationId")) {
				return {
					all: () => appliedRows,
				};
			}
			if (sql.includes("INSERT INTO schemaMigrations")) {
				return {
					run: (targetDb: string, migrationId: string) => {
						appliedRows.push({
							targetDb,
							migrationId,
						});
					},
				};
			}
			throw new Error(`Unexpected SQL in fake migration DB: ${ sql }`);
		}),
	};

	return db as unknown as Database;
}

describe(
	"schema migrations",
	() => {
		it(
			"applies pending migrations once and records them centrally",
			() => {
				const db                            = createFakeDb();
				const applied                       = vi.fn();
				const migrations: SchemaMigration[] = [
					{
						targetDb:    "user_data",
						migrationId: "001_user",
						up:          applied,
					},
					{
						targetDb:    "anime_data",
						migrationId: "001_anime",
						up:          applied,
					},
				];

				applyPendingSchemaMigrations(
					db,
					migrations,
				);
				applyPendingSchemaMigrations(
					db,
					migrations,
				);

				expect(applied).toHaveBeenCalledTimes(2);
			},
		);

		it(
			"adds the Kitsu public profile identifier once to an existing user database",
			() => {
				const appliedRows: AppliedMigrationRow[] = [
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_external_tracking_display_name",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_legacy_state",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_unused_watched_provenance",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_manual_actions",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_recover_external_tracking_pending_exports",
					},
				];
				let hasColumn                            = false;
				let hasDisplayName                       = false;
				const exec                               = vi.fn((sql: string) => {
					if (sql.includes("ADD COLUMN publicProfileIdentifier")) {
						hasColumn = true;
					}
					if (sql.includes("DROP COLUMN displayName")) {
						hasDisplayName = false;
					}
				});
				const db                                 = {
					exec,
					prepare: vi.fn((sql: string): FakeStatement => {
						if (sql.includes("SELECT targetDb, migrationId")) {
							return { all: () => appliedRows };
						}
						if (sql.includes("WHERE name = 'publicProfileIdentifier'")) {
							return { get: () => hasColumn ? { name: "publicProfileIdentifier" } : undefined };
						}
						if (sql.includes("WHERE name = 'displayName'")) {
							return { get: () => hasDisplayName ? { name: "displayName" } : undefined };
						}
						if (sql.includes("INSERT INTO schemaMigrations")) {
							return {
								run: (targetDb: string, migrationId: string) => {
									appliedRows.push({
										targetDb,
										migrationId,
									});
								},
							};
						}
						throw new Error(`Unexpected SQL in user migration DB: ${ sql }`);
					}),
				} as unknown as Database;

				applyAllPendingSchemaMigrations(db);
				applyAllPendingSchemaMigrations(db);

				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("ADD COLUMN publicProfileIdentifier"))).toHaveLength(1);
				expect(appliedRows).toContainEqual({
					targetDb:    "user_data",
					migrationId: "20260719_external_tracking_public_profile_identifier",
				});
			},
		);

		it(
			"removes the unused external tracking display name once",
			() => {
				const appliedRows: AppliedMigrationRow[] = [
					{
						targetDb:    "user_data",
						migrationId: "20260719_external_tracking_public_profile_identifier",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_legacy_state",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_unused_watched_provenance",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_manual_actions",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_recover_external_tracking_pending_exports",
					},
				];
				let hasDisplayName                       = true;
				const exec                               = vi.fn((sql: string) => {
					if (sql.includes("DROP COLUMN displayName")) {
						hasDisplayName = false;
					}
				});
				const db                                 = {
					exec,
					prepare: vi.fn((sql: string): FakeStatement => {
						if (sql.includes("SELECT targetDb, migrationId")) return { all: () => appliedRows };
						if (sql.includes("WHERE name = 'displayName'")) {
							return { get: () => hasDisplayName ? { name: "displayName" } : undefined };
						}
						if (sql.includes("INSERT INTO schemaMigrations")) {
							return {
								run: (targetDb: string, migrationId: string) => appliedRows.push({
									targetDb,
									migrationId,
								}),
							};
						}
						throw new Error(`Unexpected SQL in display-name migration DB: ${ sql }`);
					}),
				} as unknown as Database;

				applyAllPendingSchemaMigrations(db);
				applyAllPendingSchemaMigrations(db);

				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("DROP COLUMN displayName"))).toHaveLength(1);
				expect(appliedRows).toContainEqual({
					targetDb:    "user_data",
					migrationId: "20260719_remove_external_tracking_display_name",
				});
			},
		);

		it(
			"preserves active tracking state while removing legacy storage once",
			() => {
				const appliedRows: AppliedMigrationRow[] = [
					{
						targetDb:    "user_data",
						migrationId: "20260719_external_tracking_public_profile_identifier",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_external_tracking_display_name",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_unused_watched_provenance",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_manual_actions",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_recover_external_tracking_pending_exports",
					},
				];
				let hasPendingAuthUrl                    = true;
				let hasLegacyProviderState               = true;
				const exec                               = vi.fn((sql: string) => {
					if (sql.includes("DROP COLUMN pendingAuthUrl")) hasPendingAuthUrl = false;
					if (sql.includes("DROP TABLE externalTrackingProviderMediaStates")) hasLegacyProviderState = false;
				});
				const db                                 = {
					exec,
					prepare: vi.fn((sql: string): FakeStatement => {
						if (sql.includes("SELECT targetDb, migrationId")) return { all: () => appliedRows };
						if (sql.includes("WHERE name = 'pendingAuthUrl'")) {
							return { get: () => hasPendingAuthUrl ? { name: "pendingAuthUrl" } : undefined };
						}
						if (sql.includes("name = 'externalTrackingProviderMediaStates'")) {
							return {
								get: () => hasLegacyProviderState
									? { name: "externalTrackingProviderMediaStates" }
									: undefined,
							};
						}
						if (sql.includes("INSERT INTO schemaMigrations")) {
							return {
								run: (targetDb: string, migrationId: string) => appliedRows.push({
									targetDb,
									migrationId,
								}),
							};
						}
						throw new Error(`Unexpected SQL in legacy-state migration DB: ${ sql }`);
					}),
				} as unknown as Database;

				applyAllPendingSchemaMigrations(db);
				applyAllPendingSchemaMigrations(db);

				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("DROP COLUMN pendingAuthUrl"))).toHaveLength(1);
				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("INSERT INTO externalTrackingProviderMediaMappings"))).toHaveLength(1);
				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("DROP TABLE IF EXISTS externalTrackingImportRuns"))).toHaveLength(1);
				expect(appliedRows).toContainEqual({
					targetDb:    "user_data",
					migrationId: "20260719_clean_external_tracking_legacy_state",
				});
			},
		);

		it(
			"removes write-only watched provenance once",
			() => {
				const appliedRows: AppliedMigrationRow[] = [
					{
						targetDb:    "user_data",
						migrationId: "20260719_external_tracking_public_profile_identifier",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_external_tracking_display_name",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_legacy_state",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_manual_actions",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_recover_external_tracking_pending_exports",
					},
				];
				const exec                               = vi.fn();
				const db                                 = {
					exec,
					prepare: vi.fn((sql: string): FakeStatement => {
						if (sql.includes("SELECT targetDb, migrationId")) return { all: () => appliedRows };
						if (sql.includes("pragma_table_info")) return { get: () => ({ name: "legacy-column" }) };
						if (sql.includes("INSERT INTO schemaMigrations")) {
							return {
								run: (targetDb: string, migrationId: string) => appliedRows.push({
									targetDb,
									migrationId,
								}),
							};
						}
						throw new Error(`Unexpected SQL in watched-provenance migration DB: ${ sql }`);
					}),
				} as unknown as Database;

				applyAllPendingSchemaMigrations(db);
				applyAllPendingSchemaMigrations(db);

				expect(exec.mock.calls.filter(([ sql ]) => String(sql).startsWith("ALTER TABLE"))).toHaveLength(5);
				expect(appliedRows).toContainEqual({
					targetDb:    "user_data",
					migrationId: "20260719_remove_unused_watched_provenance",
				});
			},
		);

		it(
			"removes automatic external-tracking persistence once",
			() => {
				const appliedRows: AppliedMigrationRow[] = [
					{
						targetDb:    "user_data",
						migrationId: "20260719_external_tracking_public_profile_identifier",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_external_tracking_display_name",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_legacy_state",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_unused_watched_provenance",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_recover_external_tracking_pending_exports",
					},
				];
				const exec                               = vi.fn();
				const db                                 = {
					exec,
					prepare: vi.fn((sql: string): FakeStatement => {
						if (sql.includes("SELECT targetDb, migrationId")) return { all: () => appliedRows };
						if (sql.includes("name = 'externalTrackingSyncQueue'")) {
							return { get: () => ({ name: "externalTrackingSyncQueue" }) };
						}
						if (sql.includes("WHERE name = 'lastSyncedAt'")) return { get: () => ({ name: "lastSyncedAt" }) };
						if (sql.includes("INSERT INTO schemaMigrations")) {
							return {
								run: (targetDb: string, migrationId: string) => appliedRows.push({
									targetDb,
									migrationId,
								}),
							};
						}
						throw new Error(`Unexpected SQL in automatic-sync migration DB: ${ sql }`);
					}),
				} as unknown as Database;

				applyAllPendingSchemaMigrations(db);
				applyAllPendingSchemaMigrations(db);

				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("DROP TABLE IF EXISTS externalTrackingSyncQueue"))).toHaveLength(1);
				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("INSERT INTO externalTrackingPendingExports"))).toHaveLength(1);
				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("DROP COLUMN lastSyncedAt"))).toHaveLength(1);
				expect(appliedRows).toContainEqual({
					targetDb:    "user_data",
					migrationId: "20260719_clean_external_tracking_manual_actions",
				});
			},
		);

		it(
			"recovers watch changes made after an already-applied queue cleanup",
			() => {
				const appliedRows: AppliedMigrationRow[] = [
					{
						targetDb:    "user_data",
						migrationId: "20260719_external_tracking_public_profile_identifier",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_external_tracking_display_name",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_legacy_state",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_remove_unused_watched_provenance",
					},
					{
						targetDb:    "user_data",
						migrationId: "20260719_clean_external_tracking_manual_actions",
					},
				];
				const exec                               = vi.fn();
				const db                                 = {
					exec,
					prepare: vi.fn((sql: string): FakeStatement => {
						if (sql.includes("SELECT targetDb, migrationId")) return { all: () => appliedRows };
						if (sql.includes("INSERT INTO schemaMigrations")) {
							return {
								run: (targetDb: string, migrationId: string) => appliedRows.push({
									targetDb,
									migrationId,
								}),
							};
						}
						throw new Error(`Unexpected SQL in pending-export recovery migration DB: ${ sql }`);
					}),
				} as unknown as Database;

				applyAllPendingSchemaMigrations(db);
				applyAllPendingSchemaMigrations(db);

				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("state.updatedAt >= cleanup.appliedAt"))).toHaveLength(1);
				expect(exec.mock.calls.filter(([ sql ]) => String(sql).includes("DROP INDEX IF EXISTS idxUserMediaWatchStatesActiveProgress"))).toHaveLength(1);
				expect(appliedRows).toContainEqual({
					targetDb:    "user_data",
					migrationId: "20260719_recover_external_tracking_pending_exports",
				});
			},
		);

		it(
			"rejects duplicate migration ids for the same target DB",
			() => {
				const db                            = createFakeDb();
				const migrations: SchemaMigration[] = [
					{
						targetDb:    "user_data",
						migrationId: "001_duplicate",
						up:          vi.fn(),
					},
					{
						targetDb:    "user_data",
						migrationId: "001_duplicate",
						up:          vi.fn(),
					},
				];

				expect(() => applyPendingSchemaMigrations(
					db,
					migrations,
				)).toThrow("Duplicate schema migration id: user_data:001_duplicate");
			},
		);
	},
);
