import type {
	GroupBlueprintDto,
	MediaGroupSummaryDto,
} from "@nimlat/types/anime-db";
import type {
	GroupExplorerCardsPage,
	GroupInspectionSummary,
	GroupMediaWallRange,
} from "@nimlat/types/ipc-payloads";
import { runAnimeDbFacadeOperation } from "./anime-db-facade-utils";
import { countGroups } from "./groups/count-groups";
import { selectGroupBaseMediaIdById } from "./groups/select-group-base-media-id-by-id";
import { selectGroupBlueprintFromMedia } from "./groups/select-group-blueprint-from-media";
import { selectGroupExplorerCardsPage } from "./groups/select-group-explorer-cards";
import { selectGroupIdRowByBaseMediaId } from "./groups/select-group-id-by-base-media-id";
import { selectGroupInspectionSummaryById } from "./groups/select-group-inspection-summary-by-id";
import { selectGroupLastRefreshAtById } from "./groups/select-group-last-refresh-at-by-id";
import { selectGroupMediaCardsRangeById } from "./groups/select-group-media-cards-range-by-id";
import { selectGroupSummariesByMediaIds } from "./groups/select-group-summaries-by-media-ids";
import { selectMediaIdsByGroupId } from "./media/select-media-ids-by-group-id";

// Official-group read facade. All page/range methods stay bounded so renderer
// virtualization never receives unbounded anime_data group payloads.
export const AnimeDbGroupReadFacade = {
	getBlueprintFromMedia(mediaId: number): Omit<GroupBlueprintDto, "id"> | undefined {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.getBlueprintFromMedia",
			() => selectGroupBlueprintFromMedia(mediaId),
			{ mediaId },
		);
	},

	selectIdByBaseMediaId(baseMediaId: number): Pick<GroupBlueprintDto, "id"> | undefined {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.selectIdByBaseMediaId",
			() => selectGroupIdRowByBaseMediaId(baseMediaId),
			{ baseMediaId },
		);
	},

	getBaseMediaId(groupId: number): number | undefined {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.getBaseMediaId",
			() => selectGroupBaseMediaIdById(groupId),
			{ groupId },
		);
	},

	getLastRefreshAt(groupId: number): number | undefined {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.getLastRefreshAt",
			() => selectGroupLastRefreshAtById(groupId),
			{ groupId },
		);
	},

	count(): number {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.count",
			() => countGroups(),
		);
	},

	listExplorerCards(offset: number, limit: number, search: string): GroupExplorerCardsPage {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.listExplorerCards",
			() => selectGroupExplorerCardsPage(
				offset,
				limit,
				search,
			),
			{ search },
		);
	},

	getInspectionSummary(groupId: number): GroupInspectionSummary | null {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.getInspectionSummary",
			() => selectGroupInspectionSummaryById(groupId),
			{ groupId },
		);
	},

	listMediaCardsRange(groupId: number, offset: number, limit: number, search: string): GroupMediaWallRange {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.listMediaCardsRange",
			() => selectGroupMediaCardsRangeById(
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

	getMediaIds(groupId: number): number[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.getMediaIds",
			() => selectMediaIdsByGroupId(groupId),
			{ groupId },
		);
	},

	getSummariesByMediaIds(mediaIds: number[]): MediaGroupSummaryDto[] {
		return runAnimeDbFacadeOperation(
			"anime-db.facade.group.getSummariesByMediaIds",
			() => selectGroupSummariesByMediaIds(mediaIds),
			{ mediaIds },
		);
	},
} as const;
