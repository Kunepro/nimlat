import { RestoreUserGroupLineageResultDto } from "@nimlat/types/anime-db";
import { getDatabase } from "../../../utils/get-db";
import { repairAndAssertAttachedAnimeDbReconcileSafety } from "../../anime/metadata/validate-anime-db-reconcile-safety";
import { getConfigAnimeDbVersion } from "../config/anime-db-version";
import { logGroupingDiagnosticsIfDebuggingEnabled } from "./log-grouping-diagnostics-if-debugging-enabled";
import { importAnimeGroupLineageIntoUserSnapshotInternal } from "./reconcile/import-anime-group-lineage-into-user-snapshot";
import { getUserGroupingState } from "./user-grouping-state";

type UserDeletedLineageRow = {
	status: string;
	userGroupId: number | null;
};

function requireConfiguredAnimeDbVersion(): string {
	const animeDbVersion = getConfigAnimeDbVersion();
	if (typeof animeDbVersion !== "string" || animeDbVersion.trim().length === 0) {
		throw new Error("Restoring an upstream lineage requires a configured anime DB version.");
	}

	return animeDbVersion.trim();
}

function assertUserGroupingMode(): void {
	if (getUserGroupingState().groupingMode !== "user") {
		throw new Error("Restoring an upstream lineage requires user grouping mode.");
	}
}

// Restore one previously deleted upstream lineage back into the current forked user snapshot.
//
// This is a repair tool, not a normal grouping mutation:
// - it only accepts lineages already tracked in `userGroupLineages`
// - the lineage must currently be tombstoned as `deleted`
// - the restored group is copied from the current anime_data shape
export function restoreDeletedUpstreamLineage(groupLineageId: number): RestoreUserGroupLineageResultDto {
	const db                                     = getDatabase();
	let result: RestoreUserGroupLineageResultDto = {
		groupLineageId,
		restoredGroupId: 0,
		affectedMediaIds: [],
		affectedGroupIds: [],
	};

	db.transaction(() => {
		assertUserGroupingMode();
		repairAndAssertAttachedAnimeDbReconcileSafety();
		const animeDbVersion = requireConfiguredAnimeDbVersion();
		// noinspection SqlResolve
		const lineageRow = db.prepare<[ number ], UserDeletedLineageRow>(`
            SELECT status,
                   userGroupId
            FROM userGroupLineages
            WHERE groupLineageId = ?
		`).get(groupLineageId);
		if (!lineageRow) {
			throw new Error(`Cannot restore lineage ${ groupLineageId } because no user lineage row exists.`);
		}
		if (lineageRow.status !== "deleted" || lineageRow.userGroupId !== null) {
			throw new Error(`Cannot restore lineage ${ groupLineageId } because it is not currently deleted.`);
		}

		const importedGroup = importAnimeGroupLineageIntoUserSnapshotInternal(
			db,
			{
				groupLineageId,
				toAnimeDbVersion: animeDbVersion,
				now:              Date.now(),
			},
		);
		result           = {
			groupLineageId,
			restoredGroupId: importedGroup.groupId,
			affectedMediaIds: importedGroup.importedMediaIds,
			affectedGroupIds: [ importedGroup.groupId ],
		};
	})();
	logGroupingDiagnosticsIfDebuggingEnabled("restoreDeletedUpstreamLineage");

	return result;
}
