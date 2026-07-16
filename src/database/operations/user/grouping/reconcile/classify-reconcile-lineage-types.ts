import type { NumberAsBoolean } from "@nimlat/types/databases";
import type {
	ReconcileConflictAutoApplyBehavior,
	ReconcileConflictReason,
	ReconcileConflictRecommendedAction,
	ReconcileLineageClass,
	UserGroupLineageStatus,
} from "../../../../../shared/types/anime-db";

// Raw row returned by the main lineage metadata query. It joins read-only
// anime_data lineage state with the user-owned grouping snapshot.
export type LineageMetaRow = {
	groupLineageId: number;
	animeBaseMediaId: number;
	animeGroupId: number | null;
	animeGroupName: string | null;
	knownInUser: 0 | 1;
	userGroupId: number | null;
	userLineageStatus: UserGroupLineageStatus | null;
	lastUserModifiedAt: number | null;
	isUserCreated: NumberAsBoolean | null;
	collisionUserGroupId: number | null;
	collisionIsUserCreated: NumberAsBoolean | null;
};

// User-owned official lineage row whose upstream anime_data.groupLineages entry
// disappeared. Only active rows are classified because they still affect visible
// local grouping state.
export type MissingUpstreamLineageRow = {
	groupLineageId: number;
	bestKnownBaseMediaId: number;
	userGroupId: number | null;
};

// User-owned official lineage row whose upstream identity exists but no longer
// has a concrete anime_data.groups row.
export type MissingUpstreamGroupRow = {
	groupLineageId: number;
	bestKnownBaseMediaId: number;
	userGroupId: number | null;
};

export type ReconcileLineageRowClassification = {
	classification: ReconcileLineageClass;
	userGroupId: number | null;
	newMediaIds: number[];
	conflictReason: ReconcileConflictReason | null;
	conflictAutoApplyBehavior: ReconcileConflictAutoApplyBehavior | null;
	conflictRecommendedAction: ReconcileConflictRecommendedAction | null;
};
