import type {
	ReconcileConflictReason,
	ReconcileConflictRecordPayload,
	ReconcileLineageItem,
	ReconcilePreflightSummary,
} from "@nimlat/types/anime-db-reconcile";

export type ReconcileConflictInput = {
	groupLineageId: number | null;
	mediaId: number | null;
	userGroupId: number | null;
	conflictType: ReconcileConflictReason;
	payloadJson: string;
};

// Persisted run summaries are historical snapshots, so derive them from the
// already-classified items instead of requiring future reads to reconstruct them.
export function buildReconcilePreflightSummary(items: ReconcileLineageItem[]): ReconcilePreflightSummary {
	let newGroups               = 0;
	let newMediaInCleanLineages = 0;
	let cleanLineages           = 0;
	let userDeletedLineages     = 0;
	let conflicts               = 0;
	let totalNewMediaCount      = 0;

	for (const item of items) {
		switch (item.classification) {
			case "new_group":
				newGroups++;
				break;
			case "new_media_in_clean_lineage":
				newMediaInCleanLineages++;
				totalNewMediaCount += item.newMediaIds.length;
				break;
			case "clean_lineage":
				cleanLineages++;
				break;
			case "user_deleted_lineage":
				userDeletedLineages++;
				break;
			case "conflict":
				conflicts++;
				break;
		}
	}

	return {
		newGroups,
		newMediaInCleanLineages,
		cleanLineages,
		userDeletedLineages,
		conflicts,
		totalNewMediaCount,
	};
}

// Conflict rows intentionally store compact payloads beside the run row. This
// keeps manual-review state auditable even if later AnimeDB/user rows change.
export function buildReconcileConflictInputs(items: ReconcileLineageItem[]): ReconcileConflictInput[] {
	return items
		.filter(item => item.classification === "conflict" && item.conflictReason !== null)
		.map(item => {
			const conflictReason = item.conflictReason as ReconcileConflictReason;
			if (item.conflictAutoApplyBehavior === null || item.conflictRecommendedAction === null) {
				throw new Error(`Conflict lineage ${ item.groupLineageId } is missing handling guidance.`);
			}

			return ({
				groupLineageId: item.groupLineageId,
				mediaId:        null,
				userGroupId:    item.userGroupId ?? null,
				conflictType:   conflictReason,
				payloadJson:    JSON.stringify({
					animeGroupId:      item.animeGroupId,
					animeGroupName:    item.animeGroupName,
					animeBaseMediaId:  item.animeBaseMediaId,
					conflictReason,
					autoApplyBehavior: item.conflictAutoApplyBehavior,
					recommendedAction: item.conflictRecommendedAction,
				} satisfies ReconcileConflictRecordPayload),
			});
		});
}
