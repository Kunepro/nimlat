import { AnimeDbReconcileSafetyDiagnosticsDto } from "@nimlat/types/anime-db";
import BetterSqlite3, { Database as BetterSqliteDatabase } from "better-sqlite3";
import { getDatabase } from "../../../utils/get-db";
import { repairAttachedAnimeDbGroupIdentities } from "./repair-attached-anime-db-group-identities";

interface ReconcileSafetyLineageRow {
	groupLineageCount: number;
	lineagesMissingBaseMediaRecordCount: number;
	lineagesMissingBaseMediaAniListIdCount: number;
}

interface ReconcileSafetyGroupRow {
	officialGroupCount: number;
	groupsMissingLineageCount: number;
	groupsMissingBaseMediaRecordCount: number;
	groupsMissingBaseMediaAniListIdCount: number;
	groupsWithBaseMediaMismatchCount: number;
}

function qualifyTable(schemaName: string, tableName: string): string {
	return schemaName.length > 0
		? `${ schemaName }.${ tableName }`
		: tableName;
}

// Read the structural metadata that reconcile depends on from one anime DB schema.
//
// The checks stay intentionally narrow:
// - every lineage must still resolve to a concrete base-media row
// - every official group must still resolve to a lineage plus a base-media AniList id
// - group/base-media identity must stay aligned between `groups` and `groupLineages`
function inspectAnimeDbReconcileSafetyInternal(
	db: BetterSqliteDatabase,
	schemaName: string,
): AnimeDbReconcileSafetyDiagnosticsDto {
	const groupLineagesTable = qualifyTable(
		schemaName,
		"groupLineages",
	);
	const groupsTable = qualifyTable(
		schemaName,
		"groups",
	);
	const mediaTable  = qualifyTable(
		schemaName,
		"media",
	);
	const lineageRow  = db.prepare<[], ReconcileSafetyLineageRow>(`
        SELECT COUNT(*)                                                                         AS groupLineageCount,
               SUM(CASE
                       WHEN groupLineages.baseMediaId IS NULL OR baseMedia.mediaId IS NULL THEN 1
                       ELSE 0
	                   END)                                                                      AS lineagesMissingBaseMediaRecordCount,
               SUM(CASE
                       WHEN groupLineages.baseMediaId IS NULL
                           OR baseMedia.mediaId IS NULL
                           OR baseMedia.idAniList IS NULL THEN 1
                       ELSE 0
	                   END)                                                                      AS lineagesMissingBaseMediaAniListIdCount
        FROM ${ groupLineagesTable } groupLineages
                 LEFT JOIN ${ mediaTable } baseMedia
                           ON baseMedia.mediaId = groupLineages.baseMediaId
	`).get();
	const groupRow    = db.prepare<[], ReconcileSafetyGroupRow>(`
        SELECT COUNT(*)                                                                    AS officialGroupCount,
               SUM(CASE
                       WHEN groupLineages.groupLineageId IS NULL THEN 1
                       ELSE 0
	                   END)                                                                 AS groupsMissingLineageCount,
               SUM(CASE
                       WHEN groups.baseMediaId IS NULL OR baseMedia.mediaId IS NULL THEN 1
                       ELSE 0
	                   END)                                                                 AS groupsMissingBaseMediaRecordCount,
               SUM(CASE
                       WHEN groups.baseMediaId IS NULL
                           OR baseMedia.mediaId IS NULL
                           OR baseMedia.idAniList IS NULL THEN 1
                       ELSE 0
	                   END)                                                                 AS groupsMissingBaseMediaAniListIdCount,
               SUM(CASE
                       WHEN groupLineages.groupLineageId IS NOT NULL
                           AND groups.baseMediaId IS NOT NULL
                           AND groupLineages.baseMediaId IS NOT NULL
                           AND groups.baseMediaId <> groupLineages.baseMediaId THEN 1
                       ELSE 0
	                   END)                                                                 AS groupsWithBaseMediaMismatchCount
        FROM ${ groupsTable } groups
                 LEFT JOIN ${ groupLineagesTable } groupLineages
                           ON groupLineages.groupLineageId = groups.groupLineageId
                 LEFT JOIN ${ mediaTable } baseMedia
                           ON baseMedia.mediaId = groups.baseMediaId
	`).get();

	return {
		groupLineageCount:                   Number(lineageRow?.groupLineageCount ?? 0),
		officialGroupCount:                  Number(groupRow?.officialGroupCount ?? 0),
		lineagesMissingBaseMediaRecordCount: Number(lineageRow?.lineagesMissingBaseMediaRecordCount ?? 0),
		lineagesMissingBaseMediaAniListIdCount: Number(lineageRow?.lineagesMissingBaseMediaAniListIdCount ?? 0),
		groupsMissingLineageCount:              Number(groupRow?.groupsMissingLineageCount ?? 0),
		groupsMissingBaseMediaRecordCount:      Number(groupRow?.groupsMissingBaseMediaRecordCount ?? 0),
		groupsMissingBaseMediaAniListIdCount:   Number(groupRow?.groupsMissingBaseMediaAniListIdCount ?? 0),
		groupsWithBaseMediaMismatchCount:       Number(groupRow?.groupsWithBaseMediaMismatchCount ?? 0),
	};
}

function buildBlockingIssueLabels(
	diagnostics: AnimeDbReconcileSafetyDiagnosticsDto,
): string[] {
	const issueLabels: string[] = [];

	if (diagnostics.lineagesMissingBaseMediaRecordCount > 0) {
		issueLabels.push(`lineagesMissingBaseMediaRecordCount=${ diagnostics.lineagesMissingBaseMediaRecordCount }`);
	}
	if (diagnostics.lineagesMissingBaseMediaAniListIdCount > 0) {
		issueLabels.push(`lineagesMissingBaseMediaAniListIdCount=${ diagnostics.lineagesMissingBaseMediaAniListIdCount }`);
	}
	if (diagnostics.groupsMissingLineageCount > 0) {
		issueLabels.push(`groupsMissingLineageCount=${ diagnostics.groupsMissingLineageCount }`);
	}
	if (diagnostics.groupsMissingBaseMediaRecordCount > 0) {
		issueLabels.push(`groupsMissingBaseMediaRecordCount=${ diagnostics.groupsMissingBaseMediaRecordCount }`);
	}
	if (diagnostics.groupsMissingBaseMediaAniListIdCount > 0) {
		issueLabels.push(`groupsMissingBaseMediaAniListIdCount=${ diagnostics.groupsMissingBaseMediaAniListIdCount }`);
	}
	if (diagnostics.groupsWithBaseMediaMismatchCount > 0) {
		issueLabels.push(`groupsWithBaseMediaMismatchCount=${ diagnostics.groupsWithBaseMediaMismatchCount }`);
	}

	return issueLabels;
}

// Throw when the inspected anime DB shape cannot support deterministic reconcile/import.
function assertAnimeDbReconcileSafetyDiagnostics(
	diagnostics: AnimeDbReconcileSafetyDiagnosticsDto,
): void {
	const blockingIssueLabels = buildBlockingIssueLabels(diagnostics);
	if (blockingIssueLabels.length === 0) {
		return;
	}

	throw new Error(
		`Anime DB reconcile safety check failed: ${ blockingIssueLabels.join(", ") }. `
		+ "Wipe or replace the anime DB before running reconcile.",
	);
}

// Inspect the currently attached anime_data schema that the app is about to read from.
export function inspectAttachedAnimeDbReconcileSafety(): AnimeDbReconcileSafetyDiagnosticsDto {
	return inspectAnimeDbReconcileSafetyInternal(
		getDatabase(),
		"anime_data",
	);
}

// Assert that the currently attached anime DB still satisfies the minimum reconcile metadata contract.
export function assertAttachedAnimeDbReconcileSafety(): AnimeDbReconcileSafetyDiagnosticsDto {
	const diagnostics = inspectAttachedAnimeDbReconcileSafety();
	assertAnimeDbReconcileSafetyDiagnostics(diagnostics);
	return diagnostics;
}

// Apply deterministic repairs for concrete attached anime group identity rows and then assert
// that the remaining attached DB shape is safe for reconcile/import.
export function repairAndAssertAttachedAnimeDbReconcileSafety(): AnimeDbReconcileSafetyDiagnosticsDto {
	repairAttachedAnimeDbGroupIdentities();
	return assertAttachedAnimeDbReconcileSafety();
}

// Inspect one standalone anime DB file before it is promoted into the live app path.
function inspectAnimeDbFileReconcileSafety(filePath: string): AnimeDbReconcileSafetyDiagnosticsDto {
	const db = new BetterSqlite3(
		filePath,
		{
			readonly:      true,
			fileMustExist: true,
		},
	);

	try {
		return inspectAnimeDbReconcileSafetyInternal(
			db,
			"",
		);
	} finally {
		db.close();
	}
}

// Assert that one standalone anime DB file is structurally safe to swap into the app.
export function assertAnimeDbFileReconcileSafety(filePath: string): AnimeDbReconcileSafetyDiagnosticsDto {
	const diagnostics = inspectAnimeDbFileReconcileSafety(filePath);
	assertAnimeDbReconcileSafetyDiagnostics(diagnostics);
	return diagnostics;
}
