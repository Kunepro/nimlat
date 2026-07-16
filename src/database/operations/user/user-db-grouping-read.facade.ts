import type { MediaGroupSummaryDto } from "@nimlat/types/anime-db";
import type {
	GroupInspectionSummary,
	GroupMediaWallRange,
	LibraryDisplayFilters,
	LibraryDisplayItemsPage,
	LibraryDisplayScope,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import { countUserGroups } from "./grouping/count-user-groups";
import { selectAllUserGroupMediaIds } from "./grouping/select-all-user-group-media-ids";
import { selectIsOfficialGroupHidden } from "./grouping/select-is-official-group-hidden";
import { selectLibraryDisplayItemsPage } from "./grouping/select-library-display-items-page";
import { selectLibraryFilterOptions } from "./grouping/select-library-filter-options";
import { selectUserGroupBaseMediaIdById } from "./grouping/select-user-group-base-media-id-by-id";
import { selectUserGroupExplorerCardsPage } from "./grouping/select-user-group-explorer-cards";
import { selectUserGroupInspectionSummaryById } from "./grouping/select-user-group-inspection-summary-by-id";
import { selectUserGroupLastRefreshAtById } from "./grouping/select-user-group-last-refresh-at-by-id";
import { selectUserGroupMediaCardsRangeById } from "./grouping/select-user-group-media-cards-range-by-id";
import { selectUserGroupSummariesByMediaIds } from "./grouping/select-user-group-summaries-by-media-ids";
import { selectUserMediaIdsByGroupId } from "./grouping/select-user-media-ids-by-group-id";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Read-side grouping facade. Keep range, filter, and inspection rules in DB
// operations so renderer callers never need raw grouping table knowledge.
export const UserDbGroupingReadFacade = {
	isOfficialGroupHidden: (animeGroupId: number): boolean => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.isOfficialGroupHidden",
			() => selectIsOfficialGroupHidden(animeGroupId),
			{ animeGroupId },
		);
	},

	// Count user-owned group rows in the forked grouping snapshot.
	countGroups: (): number => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.countGroups",
			() => countUserGroups(),
		);
	},

	// Read explorer cards from the forked grouping snapshot.
	listExplorerCards: (offset: number, limit: number, search: string) => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.listExplorerCards",
			() => selectUserGroupExplorerCardsPage(
				offset,
				limit,
				search,
			),
			{ search },
		);
	},

	// Read the mixed Library page through DB-owned filter rules so raw-media mode
	// and adult filtering stay consistent between counts and page rows.
	listLibraryDisplayItems: (
														 offset: number,
		                         limit: number,
		                         search: string,
		                         scope?: LibraryDisplayScope,
		                         filters?: Partial<LibraryDisplayFilters>,
													 ): LibraryDisplayItemsPage => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.listLibraryDisplayItems",
			() => selectLibraryDisplayItemsPage(
				offset,
				limit,
				search,
				scope,
				filters,
			),
			{
				filters,
				search,
				scope,
			},
		);
	},

	// Read bounded metadata dictionaries for Library filter controls.
	listLibraryFilterOptions: (): LibraryFilterOptions => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.listLibraryFilterOptions",
			() => selectLibraryFilterOptions(),
		);
	},

	getInspectionSummary: (groupId: number): GroupInspectionSummary | null => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.getInspectionSummary",
			() => selectUserGroupInspectionSummaryById(groupId),
			{ groupId },
		);
	},

	// Read a bounded media-membership slice for GPU/virtualized media walls.
	listMediaCardsRange: (groupId: number, offset: number, limit: number, search: string): GroupMediaWallRange => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.listMediaCardsRange",
			() => selectUserGroupMediaCardsRangeById(
				groupId,
				offset,
				limit,
				search,
			),
			{
				groupId,
				offset,
				limit,
				search,
			},
		);
	},

	// Read current media memberships for one user-owned group row.
	getMediaIds: (groupId: number): number[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.getMediaIds",
			() => selectUserMediaIdsByGroupId(groupId),
			{ groupId },
		);
	},

	// Read every AniList-compatible media id visible through the forked user snapshot.
	listAllMediaIds: (): number[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.listAllMediaIds",
			() => selectAllUserGroupMediaIds(),
		);
	},

	// Resolve the latest known refresh timestamp for one user-owned group row.
	getLastRefreshAt: (groupId: number): number | undefined => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.getLastRefreshAt",
			() => selectUserGroupLastRefreshAtById(groupId),
			{ groupId },
		);
	},

	// Resolve the current visible primary base-media identity for one user-owned group row.
	getBaseMediaId: (groupId: number): number | undefined => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.getBaseMediaId",
			() => selectUserGroupBaseMediaIdById(groupId),
			{ groupId },
		);
	},

	getSummariesByMediaIds: (mediaIds: number[]): MediaGroupSummaryDto[] => {
		return runUserDbFacadeOperation(
			"user-db.facade.grouping.getSummariesByMediaIds",
			() => selectUserGroupSummariesByMediaIds(mediaIds),
			{ mediaIds },
		);
	},
} as const;
