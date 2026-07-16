import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	GroupMediaWallRangeRequest,
	LibraryDisplayFilters,
	LibraryDisplayItemsRangeRequest,
	LibraryDisplayScope,
	MediaInspectionOptions,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { ipcMain } from "electron";
import { retryMediaEpisodeUpdates } from "../../services/group-explorer/group-explorer-refresh-service";
import {
	getCharacterInspection,
	getGroupInspectionSummary,
	getGroupReleaseTimeline,
	getMediaEpisodeUpdatesIssue,
	getMediaInspection,
	getStaffInspection,
	getVoiceActorInspection,
	listGroupExplorerCards,
	listGroupMediaWallRange,
	listLibraryDisplayItems,
	listLibraryDisplayItemsRange,
	listLibraryFilterOptions,
	listMediaCharacters,
	listMediaStaff,
	refreshGroup,
	refreshMedia,
} from "../../services/group-explorer/group-explorer-service";

// Read/refresh IPC handlers stay as one-hop adapters; grouping mode, cache invalidation,
// and DB-backed branching are owned by services below this boundary.
export function registerGroupExplorerReadHandlers(): void {
	ipcMain.handle(
		IpcChannels.LibraryListDisplayItems,
		(
			_event,
			offset: number,
			limit: number,
			search: string,
			scope?: LibraryDisplayScope,
			filters?: Partial<LibraryDisplayFilters>,
		) => listLibraryDisplayItems(
			offset,
			limit,
			search,
			scope,
			filters,
		),
	);

	ipcMain.handle(
		IpcChannels.LibraryListDisplayItemsRange,
		(_event, request: LibraryDisplayItemsRangeRequest) => listLibraryDisplayItemsRange(request),
	);

	ipcMain.handle(
		IpcChannels.LibraryListFilterOptions,
		() => listLibraryFilterOptions(),
	);

	ipcMain.handle(
		IpcChannels.GroupListExplorerCards,
		(_event, offset: number, limit: number, search: string) => listGroupExplorerCards(
			offset,
			limit,
			search,
		),
	);

	ipcMain.handle(
		IpcChannels.GroupGetInspectionSummary,
		(_event, group: GroupRef) => getGroupInspectionSummary(group),
	);

	ipcMain.handle(
		IpcChannels.GroupMediaListRange,
		(_event, request: GroupMediaWallRangeRequest) => listGroupMediaWallRange(request),
	);

	ipcMain.handle(
		IpcChannels.GroupGetReleaseTimeline,
		(_event, group: GroupRef) => getGroupReleaseTimeline(group),
	);

	ipcMain.handle(
		IpcChannels.MediaGetInspection,
		(_event, mediaId: number, options?: MediaInspectionOptions) => getMediaInspection(
			mediaId,
			options,
		),
	);

	ipcMain.handle(
		IpcChannels.MediaListCharacters,
		(_event, mediaId: number) => listMediaCharacters(mediaId),
	);

	ipcMain.handle(
		IpcChannels.MediaListStaff,
		(_event, mediaId: number) => listMediaStaff(mediaId),
	);

	ipcMain.handle(
		IpcChannels.CharacterGetInspection,
		(_event, characterId: number) => getCharacterInspection(characterId),
	);

	ipcMain.handle(
		IpcChannels.VoiceActorGetInspection,
		(_event, staffId: number) => getVoiceActorInspection(staffId),
	);

	ipcMain.handle(
		IpcChannels.StaffGetInspection,
		(_event, staffId: number) => getStaffInspection(staffId),
	);

	ipcMain.handle(
		IpcChannels.MediaRefresh,
		(_event, mediaId: number) => refreshMedia(mediaId),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeUpdatesIssueGet,
		(_event, mediaId: number) => getMediaEpisodeUpdatesIssue(mediaId),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeUpdatesRetry,
		(_event, mediaId: number) => retryMediaEpisodeUpdates(mediaId),
	);

	ipcMain.handle(
		IpcChannels.GroupRefresh,
		(_event, group: GroupRef) => refreshGroup(group),
	);
}
