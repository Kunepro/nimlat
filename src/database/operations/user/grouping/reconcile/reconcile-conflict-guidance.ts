import type {
	ReconcileConflictAutoApplyBehavior,
	ReconcileConflictReason,
	ReconcileConflictRecommendedAction,
} from "@nimlat/types/anime-db-reconcile";

// Central policy map for how safe-apply should treat each conflict class. Phase
// 19 only imports provably safe deltas; conflicts are surfaced for review.
export function getConflictHandlingGuidance(reason: ReconcileConflictReason): {
	conflictAutoApplyBehavior: ReconcileConflictAutoApplyBehavior;
	conflictRecommendedAction: ReconcileConflictRecommendedAction;
} {
	switch (reason) {
		case "upstream_group_missing":
		case "upstream_lineage_removed":
		case "upstream_media_removed":
			return {
				conflictAutoApplyBehavior: "skip_warn",
				conflictRecommendedAction: "review_upstream_grouping_change",
			};
		case "lineage_identity_collision":
			return {
				conflictAutoApplyBehavior: "skip_blocking",
				conflictRecommendedAction: "review_and_reassign_lineage",
			};
		case "lineage_merged":
			return {
				conflictAutoApplyBehavior: "skip_blocking",
				conflictRecommendedAction: "review_and_restore_lineage",
			};
		case "lineage_ownership_changed":
		case "user_created_group":
			return {
				conflictAutoApplyBehavior: "skip_blocking",
				conflictRecommendedAction: "review_and_keep_current_grouping",
			};
		case "lineage_membership_reshaped":
		case "lineage_membership_drift":
			return {
				conflictAutoApplyBehavior: "skip_blocking",
				conflictRecommendedAction: "review_upstream_grouping_change",
			};
	}
}
