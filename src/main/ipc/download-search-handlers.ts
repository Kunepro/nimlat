import { IpcChannels } from "@nimlat/constants/ipc-channels";
import {
	CreateDownloadSearchKeywordPresetRequest,
	CreateDownloadSearchProviderRequest,
	CreateDownloadSearchQueryPresetRequest,
	DownloadBrowserConfig,
	OpenDownloadSearchRequest,
	SaveDownloadSearchBuilderStateRequest,
	UpdateDownloadSearchProviderRequest,
} from "@nimlat/types/download-search";
import { ipcMain } from "electron";
import { DownloadSearchService } from "../services/download-search/download-search-service";

export function registerDownloadSearchHandlers(): void {
	ipcMain.handle(
		IpcChannels.DownloadSearchSettingsGet,
		() => DownloadSearchService.getSettings(),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchBuilderStateSave,
		(_event, request: SaveDownloadSearchBuilderStateRequest) => DownloadSearchService.saveBuilderState(request),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchBrowserConfigSave,
		(_event, config: DownloadBrowserConfig) => DownloadSearchService.saveBrowserConfig(config),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchProviderEnabledSet,
		(_event, providerId: string, enabled: boolean) => DownloadSearchService.setProviderEnabled(
			providerId,
			enabled,
		),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchProviderCreate,
		(_event, request: CreateDownloadSearchProviderRequest) => DownloadSearchService.createProvider(request),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchProviderUpdate,
		(_event, request: UpdateDownloadSearchProviderRequest) => DownloadSearchService.updateProvider(request),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchProviderDelete,
		(_event, providerId: string) => DownloadSearchService.deleteProvider(providerId),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchKeywordPresetCreate,
		(_event, request: CreateDownloadSearchKeywordPresetRequest) => DownloadSearchService.createKeywordPreset(request),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchQueryPresetCreate,
		(_event, request: CreateDownloadSearchQueryPresetRequest) => DownloadSearchService.createQueryPreset(request),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchQueryPresetEnabledSet,
		(_event, presetId: string, enabled: boolean) => DownloadSearchService.setQueryPresetEnabled(
			presetId,
			enabled,
		),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchQueryPresetDelete,
		(_event, presetId: string) => DownloadSearchService.deleteQueryPreset(presetId),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchOpen,
		(_event, request: OpenDownloadSearchRequest) => DownloadSearchService.openProviderSearch(request),
	);
	ipcMain.handle(
		IpcChannels.DownloadSearchBrowserExecutablePick,
		() => DownloadSearchService.pickBrowserExecutable(),
	);
}
