import { IpcChannels } from "@nimlat/constants/ipc-channels";
import type {
	ConnectKitsuPasswordRequest,
	ExternalTrackingProvider,
	ImportKitsuPublicProfileRequest,
	SaveExternalTrackingTokenRequest,
	StartExternalTrackingConnectionRequest,
} from "@nimlat/types/external-tracking";
import { ipcMain } from "electron";
import { ExternalTrackingService } from "../services/external-tracking/external-tracking-service";

export function registerExternalTrackingHandlers(): void {
	ipcMain.handle(
		IpcChannels.ExternalTrackingSettingsGet,
		() => ExternalTrackingService.getSettings(),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingSecretStorageRetry,
		() => ExternalTrackingService.retrySecretStorage(),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingConnectionStart,
		(_event, request: StartExternalTrackingConnectionRequest) => ExternalTrackingService.startConnection(request),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingImplicitTokenSave,
		(_event, request: SaveExternalTrackingTokenRequest) => ExternalTrackingService.saveImplicitToken(request),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingKitsuPasswordConnect,
		(_event, request: ConnectKitsuPasswordRequest) => ExternalTrackingService.connectKitsu(request),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingDisconnect,
		(_event, provider: ExternalTrackingProvider) => ExternalTrackingService.disconnect(provider),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingImport,
		(_event, provider: ExternalTrackingProvider) => ExternalTrackingService.importProvider(provider),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingKitsuPublicImport,
		(_event, request: ImportKitsuPublicProfileRequest) => ExternalTrackingService.importKitsuPublic(request),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingKitsuXmlImport,
		() => ExternalTrackingService.importKitsuXml(),
	);
	ipcMain.handle(
		IpcChannels.ExternalTrackingExport,
		(_event, provider: ExternalTrackingProvider) => ExternalTrackingService.exportToProvider(provider),
	);
}
