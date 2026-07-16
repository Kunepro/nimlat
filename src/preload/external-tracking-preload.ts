import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	ConnectKitsuPasswordRequest,
	ExternalTrackingAccountsChangedEvent,
	ExternalTrackingExportProgressEvent,
	ExternalTrackingProvider,
	ImportKitsuPublicProfileRequest,
	SaveExternalTrackingTokenRequest,
	StartExternalTrackingConnectionRequest,
} from "@nimlat/types/external-tracking";
import { ipcRenderer } from "electron";

export const externalTrackingApi = {
	externalTracking: {
		getSettings:        () => ipcRenderer.invoke(IpcChannels.ExternalTrackingSettingsGet),
		retrySecretStorage: () => ipcRenderer.invoke(IpcChannels.ExternalTrackingSecretStorageRetry),
		startConnection:    (request: StartExternalTrackingConnectionRequest) => ipcRenderer.invoke(
			IpcChannels.ExternalTrackingConnectionStart,
			request,
		),
		saveImplicitToken:  (request: SaveExternalTrackingTokenRequest) => ipcRenderer.invoke(
			IpcChannels.ExternalTrackingImplicitTokenSave,
			request,
		),
		connectKitsu:       (request: ConnectKitsuPasswordRequest) => ipcRenderer.invoke(
			IpcChannels.ExternalTrackingKitsuPasswordConnect,
			request,
		),
		disconnect:         (provider: ExternalTrackingProvider) => ipcRenderer.invoke(
			IpcChannels.ExternalTrackingDisconnect,
			provider,
		),
		importProvider:     (provider: ExternalTrackingProvider) => ipcRenderer.invoke(
			IpcChannels.ExternalTrackingImport,
			provider,
		),
		importKitsuPublic:  (request: ImportKitsuPublicProfileRequest) => ipcRenderer.invoke(
			IpcChannels.ExternalTrackingKitsuPublicImport,
			request,
		),
		importKitsuXml:     () => ipcRenderer.invoke(IpcChannels.ExternalTrackingKitsuXmlImport),
		exportProvider:     (provider: ExternalTrackingProvider) => ipcRenderer.invoke(
			IpcChannels.ExternalTrackingExport,
			provider,
		),
		onAccountsChanged:  (callback: (event: ExternalTrackingAccountsChangedEvent) => void): (() => void) => {
			const listener = (_: unknown, event: ExternalTrackingAccountsChangedEvent) => callback(event);
			ipcRenderer.on(
				IpcChannels.ExternalTrackingAccountsChanged,
				listener,
			);
			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ExternalTrackingAccountsChanged,
					listener,
				);
			};
		},
		onExportProgress:   (callback: (event: ExternalTrackingExportProgressEvent) => void): (() => void) => {
			const listener = (_: unknown, event: ExternalTrackingExportProgressEvent) => callback(event);
			ipcRenderer.on(
				IpcChannels.ExternalTrackingExportProgress,
				listener,
			);
			return () => {
				ipcRenderer.removeListener(
					IpcChannels.ExternalTrackingExportProgress,
					listener,
				);
			};
		},
	},
};
