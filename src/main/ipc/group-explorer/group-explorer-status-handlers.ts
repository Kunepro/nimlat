import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	SaveEpisodeIntegrationStateRequest,
	SaveMediaIntegrationStateRequest,
	SetEpisodeIntegrationStatusesRequest,
	SetEpisodeIntegrationStatusRequest,
	SetEpisodeWatchStateRequest,
	SetEpisodeWatchStatesRequest,
	SetGroupIntegrationStatusRequest,
	SetGroupWatchStateRequest,
	SetMediaIntegrationStatusRequest,
	SetMediaWatchStateRequest,
} from "@nimlat/types/ipc-payloads";
import { ipcMain } from "electron";
import { getGroupingMode } from "../../services/group-explorer/group-explorer-service";
import { IntegrationStatusService } from "../../services/integration/integration-status-service";
import { WatchStateService } from "../../services/watch/watch-state-service";

// Status handlers are separated from explorer reads so watch/integration writes
// remain visibly routed through their domain services and do not grow IPC logic.
export function registerGroupExplorerStatusHandlers(): void {
	ipcMain.handle(
		IpcChannels.MediaEpisodeIntegrationSet,
		(_event, request: SetEpisodeIntegrationStatusRequest) => IntegrationStatusService.setEpisodeStatus(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeIntegrationBulkSet,
		(_event, request: SetEpisodeIntegrationStatusesRequest) => IntegrationStatusService.setEpisodeStatuses(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeIntegrationSave,
		(_event, request: SaveEpisodeIntegrationStateRequest) => IntegrationStatusService.saveEpisodeState(request),
	);

	ipcMain.handle(
		IpcChannels.MediaIntegrationSet,
		(_event, request: SetMediaIntegrationStatusRequest) => IntegrationStatusService.setMediaStatus(request),
	);

	ipcMain.handle(
		IpcChannels.MediaIntegrationSave,
		(_event, request: SaveMediaIntegrationStateRequest) => IntegrationStatusService.saveMediaState(request),
	);

	ipcMain.handle(
		IpcChannels.MediaWatchStateSet,
		(_event, request: SetMediaWatchStateRequest) => WatchStateService.setMediaWatchState(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeWatchStateSet,
		(_event, request: SetEpisodeWatchStateRequest) => WatchStateService.setEpisodeWatchState(request),
	);

	ipcMain.handle(
		IpcChannels.MediaEpisodeWatchStatesSet,
		(_event, request: SetEpisodeWatchStatesRequest) => WatchStateService.setEpisodeWatchStates(request),
	);

	ipcMain.handle(
		IpcChannels.GroupIntegrationSet,
		(_event, request: SetGroupIntegrationStatusRequest) => IntegrationStatusService.setGroupStatus(request),
	);

	ipcMain.handle(
		IpcChannels.GroupWatchStateSet,
		(_event, request: SetGroupWatchStateRequest) => WatchStateService.setGroupWatchState(
			request.group,
			request.isWatched,
		),
	);

	ipcMain.handle(
		IpcChannels.GroupGetGroupingMode,
		() => getGroupingMode(),
	);
}
