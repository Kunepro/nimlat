import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import { GroupMediaWallRange } from "@nimlat/types/ipc-payloads";
import { GroupRef } from "@nimlat/types/nimlat-ids";

// Centralized read boundary for Group grouping.
//
// Why this exists:
// - hide the current grouping mode from feature services
// - keep the anime-mode vs user-mode switch in one place
// - make later migration of more read paths incremental instead of scattering branching logic
export class GroupReadRepository {
	public static listExplorerCards(offset: number, limit: number, search: string) {
		return this.isUserMode()
			? UserDbFacade.grouping.listExplorerCards(
				offset,
				limit,
				search,
			)
			: AnimeDbFacade.group.listExplorerCards(
				offset,
				limit,
				search,
			);
	}

	public static getInspectionSummaryByRef(group: GroupRef) {
		if (group.source === "official" && !this.isAdminMode() && UserDbFacade.grouping.isOfficialGroupHidden(group.groupId)) {
			return null;
		}
		return group.source === "user"
			? UserDbFacade.grouping.getInspectionSummary(group.groupId)
			: AnimeDbFacade.group.getInspectionSummary(group.groupId);
	}

	public static listMediaCardsRangeByRef(group: GroupRef, offset: number, limit: number, search: string): GroupMediaWallRange {
		if (group.source === "official" && !this.isAdminMode() && UserDbFacade.grouping.isOfficialGroupHidden(group.groupId)) {
			return {
				offset,
				total: 0,
				items: [],
			};
		}
		return group.source === "user"
			? UserDbFacade.grouping.listMediaCardsRange(
				group.groupId,
				offset,
				limit,
				search,
			)
			: AnimeDbFacade.group.listMediaCardsRange(
				group.groupId,
				offset,
				limit,
				search,
			);
	}

	public static getMediaIds(groupId: number): number[] {
		return this.isUserMode()
			? UserDbFacade.grouping.getMediaIds(groupId)
			: AnimeDbFacade.group.getMediaIds(groupId);
	}

	public static getMediaIdsByRef(group: GroupRef): number[] {
		if (group.source === "official" && !this.isAdminMode() && UserDbFacade.grouping.isOfficialGroupHidden(group.groupId)) {
			return [];
		}
		return group.source === "user"
			? UserDbFacade.grouping.getMediaIds(group.groupId)
			: AnimeDbFacade.group.getMediaIds(group.groupId);
	}

	public static getLastRefreshAt(groupId: number): number | undefined {
		return this.isUserMode()
			? UserDbFacade.grouping.getLastRefreshAt(groupId)
			: AnimeDbFacade.group.getLastRefreshAt(groupId);
	}

	public static getLastRefreshAtByRef(group: GroupRef): number | undefined {
		if (group.source === "official" && !this.isAdminMode() && UserDbFacade.grouping.isOfficialGroupHidden(group.groupId)) {
			return undefined;
		}
		return group.source === "user"
			? UserDbFacade.grouping.getLastRefreshAt(group.groupId)
			: AnimeDbFacade.group.getLastRefreshAt(group.groupId);
	}

	public static getBaseMediaId(groupId: number): number | undefined {
		return this.isUserMode()
			? UserDbFacade.grouping.getBaseMediaId(groupId)
			: AnimeDbFacade.group.getBaseMediaId(groupId);
	}

	private static isUserMode(): boolean {
		return !this.isAdminMode() && UserDbFacade.grouping.getState().groupingMode === "user";
	}

	private static isAdminMode(): boolean {
		return UserDbFacade.config.isAdminModeEnabled();
	}
}
