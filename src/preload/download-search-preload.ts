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
import { ipcRenderer } from "electron";

export const downloadSearchApi = {
	downloadSearch: {
		getSettings:           () => ipcRenderer.invoke(IpcChannels.DownloadSearchSettingsGet),
		saveBuilderState:      (request: SaveDownloadSearchBuilderStateRequest) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchBuilderStateSave,
			request,
		),
		saveBrowserConfig:     (config: DownloadBrowserConfig) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchBrowserConfigSave,
			config,
		),
		setProviderEnabled:    (providerId: string, enabled: boolean) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchProviderEnabledSet,
			providerId,
			enabled,
		),
		createProvider:        (request: CreateDownloadSearchProviderRequest) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchProviderCreate,
			request,
		),
		updateProvider:        (request: UpdateDownloadSearchProviderRequest) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchProviderUpdate,
			request,
		),
		deleteProvider:        (providerId: string) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchProviderDelete,
			providerId,
		),
		createKeywordPreset:   (request: CreateDownloadSearchKeywordPresetRequest) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchKeywordPresetCreate,
			request,
		),
		createQueryPreset:     (request: CreateDownloadSearchQueryPresetRequest) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchQueryPresetCreate,
			request,
		),
		setQueryPresetEnabled: (presetId: string, enabled: boolean) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchQueryPresetEnabledSet,
			presetId,
			enabled,
		),
		deleteQueryPreset:     (presetId: string) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchQueryPresetDelete,
			presetId,
		),
		openProviderSearch:    (request: OpenDownloadSearchRequest) => ipcRenderer.invoke(
			IpcChannels.DownloadSearchOpen,
			request,
		),
		pickBrowserExecutable: () => ipcRenderer.invoke(IpcChannels.DownloadSearchBrowserExecutablePick),
	},
};
