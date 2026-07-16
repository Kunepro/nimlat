import type {
	ReconcileConflictReason,
	ReconcileLineageItem,
} from "@nimlat/types/anime-db-reconcile";
import type { Database } from "better-sqlite3";
import type {
	LineageMetaRow,
	MissingUpstreamGroupRow,
	MissingUpstreamLineageRow,
	ReconcileLineageRowClassification,
} from "./classify-reconcile-lineage-types";
import { getConflictHandlingGuidance } from "./reconcile-conflict-guidance";
import {
	getAnimeOnlyMediaIds,
	getUserOnlyMediaIds,
	hasAnyMissingAnimeMedia,
} from "./reconcile-membership-diff";

export function classifyMissingUpstreamLineageRow(row: MissingUpstreamLineageRow): ReconcileLineageItem {
	const guidance = getConflictHandlingGuidance("upstream_lineage_removed");

	return {
		groupLineageId:            row.groupLineageId,
		classification:            "conflict",
		animeGroupId:              null,
		animeGroupName:            null,
		animeBaseMediaId:          row.bestKnownBaseMediaId,
		userGroupId:               row.userGroupId,
		newMediaIds:               [],
		conflictReason:            "upstream_lineage_removed",
		conflictAutoApplyBehavior: guidance.conflictAutoApplyBehavior,
		conflictRecommendedAction: guidance.conflictRecommendedAction,
	};
}

export function classifyMissingUpstreamGroupRow(row: MissingUpstreamGroupRow): ReconcileLineageItem {
	const guidance = getConflictHandlingGuidance("upstream_group_missing");

	return {
		groupLineageId:            row.groupLineageId,
		classification:            "conflict",
		animeGroupId:              null,
		animeGroupName:            null,
		animeBaseMediaId:          row.bestKnownBaseMediaId,
		userGroupId:               row.userGroupId,
		newMediaIds:               [],
		conflictReason:            "upstream_group_missing",
		conflictAutoApplyBehavior: guidance.conflictAutoApplyBehavior,
		conflictRecommendedAction: guidance.conflictRecommendedAction,
	};
}

function createConflictClassification(
	userGroupId: number | null,
	conflictReason: ReconcileConflictReason,
): ReconcileLineageRowClassification {
	const guidance = getConflictHandlingGuidance(conflictReason);

	return {
		classification:            "conflict",
		userGroupId,
		newMediaIds:               [],
		conflictReason,
		conflictAutoApplyBehavior: guidance.conflictAutoApplyBehavior,
		conflictRecommendedAction: guidance.conflictRecommendedAction,
	};
}

// Classify one lineage metadata row. Clean active lineages are the only branch
// that reads membership diff SQL; all user-modified or ambiguous rows become
// explicit conflicts for manual review.
export function classifyReconcileLineageMetaRow(row: LineageMetaRow, db: Database): ReconcileLineageRowClassification {
	if (!row.knownInUser) {
		// A user-created standalone group can already occupy this lineage/base-media identity even
		// before a userGroupLineages row exists. Importing a duplicate official group would be unsafe.
		if (row.collisionUserGroupId !== null) {
			return createConflictClassification(
				row.collisionUserGroupId,
				row.collisionIsUserCreated === 1 ? "user_created_group" : "lineage_identity_collision",
			);
		}

		return {
			classification:            "new_group",
			userGroupId:               null,
			newMediaIds:               [],
			conflictReason:            null,
			conflictAutoApplyBehavior: null,
			conflictRecommendedAction: null,
		};
	}

	if (row.userLineageStatus === "deleted") {
		return {
			classification:            "user_deleted_lineage",
			userGroupId:               row.userGroupId,
			newMediaIds:               [],
			conflictReason:            null,
			conflictAutoApplyBehavior: null,
			conflictRecommendedAction: null,
		};
	}

	if (row.userLineageStatus === "merged") {
		return createConflictClassification(
			row.userGroupId,
			"lineage_merged",
		);
	}

	if (row.lastUserModifiedAt !== null) {
		return createConflictClassification(
			row.userGroupId,
			"lineage_ownership_changed",
		);
	}

	if (row.isUserCreated === 1) {
		return createConflictClassification(
			row.userGroupId,
			"user_created_group",
		);
	}

	if (row.animeGroupId == null) {
		return createConflictClassification(
			row.userGroupId,
			"upstream_group_missing",
		);
	}

	if (row.userGroupId == null) {
		return createConflictClassification(
			row.userGroupId,
			"lineage_ownership_changed",
		);
	}

	const userOnlyMediaIds  = getUserOnlyMediaIds(
		db,
		row.userGroupId,
		row.animeGroupId,
	);
	const animeOnlyMediaIds = getAnimeOnlyMediaIds(
		db,
		row.animeGroupId,
		row.userGroupId,
	);
	if (userOnlyMediaIds.length > 0) {
		const conflictReason = hasAnyMissingAnimeMedia(
			db,
			userOnlyMediaIds,
		)
			? "upstream_media_removed"
			: animeOnlyMediaIds.length > 0
				? "lineage_membership_reshaped"
				: "lineage_membership_drift";

		return createConflictClassification(
			row.userGroupId,
			conflictReason,
		);
	}

	if (animeOnlyMediaIds.length > 0) {
		return {
			classification:            "new_media_in_clean_lineage",
			userGroupId:               row.userGroupId,
			newMediaIds:               animeOnlyMediaIds,
			conflictReason:            null,
			conflictAutoApplyBehavior: null,
			conflictRecommendedAction: null,
		};
	}

	return {
		classification:            "clean_lineage",
		userGroupId:               row.userGroupId,
		newMediaIds:               [],
		conflictReason:            null,
		conflictAutoApplyBehavior: null,
		conflictRecommendedAction: null,
	};
}
