import type {
	GroupingMutationImpactDto,
	RestoreUserGroupLineageResultDto,
	UserGroupingDiagnosticsDto,
	UserGroupingStateDto,
	UserGroupLineageDto,
} from "@nimlat/types/anime-db";
import { forkAnimeGroupingToUserSnapshot } from "./grouping/fork-anime-grouping-to-user-snapshot";
import { inspectUserGroupingDiagnostics } from "./grouping/inspect-user-grouping-diagnostics";
import { rebuildUserGroupingFromAnimeDefaults } from "./grouping/rebuild-user-grouping-from-anime-defaults";
import { resetUserGroupingToAnimeDefault } from "./grouping/reset-user-grouping-to-anime-default";
import { restoreDeletedUpstreamLineage as restoreDeletedUpstreamLineageOperation } from "./grouping/restore-deleted-upstream-lineage";
import {
	clearUserGroupingSnapshot,
	saveUserGroupLineage,
} from "./grouping/user-grouping-snapshot";
import {
	getUserGroupingState,
	saveUserGroupingState,
} from "./grouping/user-grouping-state";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Grouping state/lifecycle facade. Snapshot mode, diagnostics, and lineage
// persistence are exposed together because they govern how user_data shadows
// the released anime_data grouping baseline without mutating anime_data rows.
export const UserDbGroupingStateFacade = {
	// Read whether grouping currently resolves from anime defaults or the forked user snapshot.
	getState: (): UserGroupingStateDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.getState",
			() => getUserGroupingState(),
		);
	},

	// Inspect snapshot/reconcile bookkeeping for diagnostics without mutating user data.
	inspectDiagnostics: (): UserGroupingDiagnosticsDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.inspectDiagnostics",
			() => inspectUserGroupingDiagnostics(),
		);
	},

	// Materialize anime-mode grouping into the user-owned snapshot and switch mode to user.
	forkAnimeGroupingToSnapshot: (): void => {
		runUserDbFacadeOperation(
			"user-db.facade.grouping.forkAnimeGroupingToSnapshot",
			() => forkAnimeGroupingToUserSnapshot(),
		);
	},

	// Persist grouping mode/state after fork/reset/reconcile operations.
	saveState: (state: UserGroupingStateDto): void => {
		runUserDbFacadeOperation(
			"user-db.facade.grouping.saveState",
			() => saveUserGroupingState(state),
			{ groupingMode: state.groupingMode },
		);
	},

	// Remove the user-owned grouping snapshot so reset flows can fall back to anime_data.
	clearSnapshot: (): void => {
		runUserDbFacadeOperation(
			"user-db.facade.grouping.clearSnapshot",
			() => clearUserGroupingSnapshot(),
		);
	},

	// Reset grouping to anime defaults while preserving unrelated user data.
	resetToAnimeGrouping: (): void => {
		runUserDbFacadeOperation(
			"user-db.facade.grouping.resetToAnimeGrouping",
			() => resetUserGroupingToAnimeDefault(),
		);
	},

	// Rebuild the forked user grouping snapshot from current anime defaults.
	rebuildFromCurrentAnimeDefaults: (): GroupingMutationImpactDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.rebuildFromCurrentAnimeDefaults",
			() => rebuildUserGroupingFromAnimeDefaults(),
		);
	},

	// Restore one tombstoned official lineage back into the current user snapshot.
	restoreDeletedUpstreamLineage: (groupLineageId: number): RestoreUserGroupLineageResultDto => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.restoreDeletedUpstreamLineage",
			() => restoreDeletedUpstreamLineageOperation(groupLineageId),
			{ groupLineageId },
		);
	},

	// Persist one upstream official-group lineage mapping into the forked user snapshot.
	saveGroupLineage: (lineage: UserGroupLineageDto): void => {
		runUserDbFacadeOperation(
			"user-db.facade.grouping.saveGroupLineage",
			() => saveUserGroupLineage(lineage),
			{
				animeBaseMediaId: lineage.animeBaseMediaId,
				userGroupId:      lineage.userGroupId,
				status:           lineage.status,
			},
		);
	},
} as const;
