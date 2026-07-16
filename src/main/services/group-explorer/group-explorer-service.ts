import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import type { UserGroupingMode } from "@nimlat/types/anime-db-user-state";
import {
	CharacterInspectionData,
	GroupExplorerCardsPage,
	GroupInspectionSummary,
	GroupMediaWallRange,
	GroupMediaWallRangeRequest,
	LibraryDisplayFilters,
	LibraryDisplayItemsPage,
	LibraryDisplayItemsRange,
	LibraryDisplayItemsRangeRequest,
	LibraryDisplayScope,
	LibraryFilterOptions,
	MediaCharacterListItem,
	MediaEpisodeUpdatesIssue,
	MediaInspectionData,
	MediaInspectionOptions,
	MediaStaffListItem,
	StaffInspectionData,
	VoiceActorInspectionData,
} from "@nimlat/types/ipc-payloads";
import { GroupRef } from "@nimlat/types/nimlat-ids";
import { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
import { GroupReadRepository } from "../group/group-read-repository";
import { MediaInspectionRefreshService } from "../media/media-inspection-refresh-service";
import { NetworkStatusReadService } from "../network/network-status-read-service";
import {
	attachCharacterInspectionDisplayImages,
	attachGroupInspectionDisplayImages,
	attachGroupMediaWallDisplayImages,
	attachLibraryDisplayImages,
	attachMediaInspectionDisplayImages,
	attachStaffInspectionDisplayImages,
	attachVoiceActorInspectionDisplayImages,
} from "./group-explorer-image-presenter";
import { buildMediaEpisodeUpdatesIssue } from "./media-episode-updates-issue-presenter";
import { listMediaInspectionGroups } from "./media-inspection-groups-read-model";

const DEFAULT_LIST_RANGE_LIMIT = 160;
const MAX_LIST_RANGE_LIMIT     = 500;

interface BoundedListRange {
	offset: number;
	limit: number;
}

// IPC payload types do not provide runtime validation. Keep every list read bounded
// in main so malformed or compromised renderer requests cannot turn LIMIT into an
// unbounded catalog transfer. The 500-row ceiling leaves ample headroom over the
// media wall's normal 160-row request while preserving predictable memory use.
function resolveBoundedListRange(offset: number, limit: number): BoundedListRange {
	const boundedOffset = typeof offset === "number" && Number.isFinite(offset)
		? Math.min(
			Number.MAX_SAFE_INTEGER,
			Math.max(
				0,
				Math.floor(offset),
			),
		)
		: 0;
	const boundedLimit  = typeof limit === "number" && Number.isFinite(limit)
		? Math.min(
			MAX_LIST_RANGE_LIMIT,
			Math.max(
				1,
				Math.floor(limit),
			),
		)
		: DEFAULT_LIST_RANGE_LIMIT;

	return {
		offset: boundedOffset,
		limit:  boundedLimit,
	};
}

export {
	refreshGroup,
	refreshMedia,
} from "./group-explorer-refresh-service";

export function listGroupExplorerCards(offset: number, limit: number, search: string): GroupExplorerCardsPage {
	const range = resolveBoundedListRange(
		offset,
		limit,
	);
	return GroupReadRepository.listExplorerCards(
		range.offset,
		range.limit,
		search,
	);
}

// Read the mixed Library page while keeping display/adult filters in the DB layer;
// the main service only resolves display images after the bounded rows are selected.
export function listLibraryDisplayItems(offset: number, limit: number, search: string, scope: LibraryDisplayScope = "library", filters: Partial<LibraryDisplayFilters> = {}): LibraryDisplayItemsPage {
	const range = resolveBoundedListRange(
		offset,
		limit,
	);
	const page  = UserDbFacade.grouping.listLibraryDisplayItems(
		range.offset,
		range.limit,
		search,
		scope,
		filters,
	);

	return attachLibraryDisplayImages(page);
}

export function listLibraryFilterOptions(): LibraryFilterOptions {
	return UserDbFacade.grouping.listLibraryFilterOptions();
}

export function getGroupingMode(): UserGroupingMode {
	return UserDbFacade.grouping.getState().groupingMode;
}

export function listLibraryDisplayItemsRange(request: LibraryDisplayItemsRangeRequest): LibraryDisplayItemsRange {
	const range = resolveBoundedListRange(
		request.offset,
		request.limit,
	);
	const page  = listLibraryDisplayItems(
		range.offset,
		range.limit,
		request.search,
		request.scope ?? "library",
		{
			adultFilter: request.adultFilter,
			displayMode: request.displayMode,
			genreNames:  request.genreNames,
			tagNames:    request.tagNames,
		},
	);

	return {
		offset: range.offset,
		total:  page.total,
		items:  page.items,
	};
}

export function listGroupMediaWallRange(request: GroupMediaWallRangeRequest): GroupMediaWallRange {
	const boundedRange = resolveBoundedListRange(
		request.offset,
		request.limit,
	);
	const range        = GroupReadRepository.listMediaCardsRangeByRef(
		request.group,
		boundedRange.offset,
		boundedRange.limit,
		request.search,
	);

	return attachGroupMediaWallDisplayImages(range);
}

export function getGroupInspectionSummary(group: GroupRef): GroupInspectionSummary | null {
	const summary = GroupReadRepository.getInspectionSummaryByRef(group);
	if (!summary) {
		return null;
	}

	return attachGroupInspectionDisplayImages(
		group,
		summary,
	);
}

export function getGroupReleaseTimeline(group: GroupRef): GroupReleaseTimelineRow[] {
	return UserDbFacade.releaseWatch.getGroupTimeline(group);
}

export function getMediaInspection(mediaId: number, options?: MediaInspectionOptions): MediaInspectionData | null {
	const inspection = AnimeDbFacade.media.getInspection(
		mediaId,
		options,
	);
	if (!inspection) {
		return null;
	}

	MediaInspectionRefreshService.scheduleForInspection(mediaId);

	return attachMediaInspectionDisplayImages({
		mediaId,
		inspection,
		groups: listMediaInspectionGroups(
			mediaId,
			options?.groupSource,
		),
		includeEpisodes: options?.includeEpisodes !== false,
	});
}

export function listMediaCharacters(mediaId: number): MediaCharacterListItem[] {
	return AnimeDbFacade.media.listCharacters(mediaId);
}

export function listMediaStaff(mediaId: number): MediaStaffListItem[] {
	return AnimeDbFacade.media.listStaff(mediaId);
}

export function getCharacterInspection(characterId: number): CharacterInspectionData | null {
	const inspection = AnimeDbFacade.getCharacterInspection(characterId);
	if (!inspection) {
		return null;
	}

	return attachCharacterInspectionDisplayImages(inspection);
}

export function getVoiceActorInspection(staffId: number): VoiceActorInspectionData | null {
	const inspection = AnimeDbFacade.getVoiceActorInspection(staffId);
	if (!inspection) {
		return null;
	}

	return attachVoiceActorInspectionDisplayImages(inspection);
}

export function getStaffInspection(staffId: number): StaffInspectionData | null {
	const inspection = AnimeDbFacade.getStaffInspection(staffId);
	if (!inspection) {
		return null;
	}

	return attachStaffInspectionDisplayImages(inspection);
}

export function getMediaEpisodeUpdatesIssue(mediaId: number): MediaEpisodeUpdatesIssue | null {
	const providerIds = AnimeDbFacade.media.getProviderIds(mediaId);
	const status      = AnimeDbFacade.getMediaEpisodeUpdatesQueueStatus(mediaId);
	const failedIssue = status === "failed"
		? AnimeDbFacade.getMediaEpisodeUpdatesIssue(mediaId)
		: null;

	return buildMediaEpisodeUpdatesIssue({
		mediaId,
		hasMalId:    typeof providerIds.idMal === "number",
		queueStatus: status,
		failedIssue,
		isOnline:    NetworkStatusReadService.isOnline(),
	});
}
