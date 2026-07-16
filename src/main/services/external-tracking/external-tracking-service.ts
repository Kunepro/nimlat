import type {
	ConnectKitsuPasswordRequest,
	ExternalTrackingAccount,
	ExternalTrackingActionResult,
	ExternalTrackingImportResult,
	ExternalTrackingProvider,
	ExternalTrackingSecretStorageStatus,
	ExternalTrackingSettings,
	ImportKitsuPublicProfileRequest,
	SaveExternalTrackingTokenRequest,
	StartExternalTrackingConnectionRequest,
	StartExternalTrackingConnectionResult,
} from "@nimlat/types/external-tracking";
import {
	connectKitsuWithPassword,
	disconnectExternalTrackingProvider,
	saveExternalTrackingImplicitToken,
	startExternalTrackingConnection,
} from "./external-tracking-connection-service";
import { importExternalTrackingProvider } from "./external-tracking-import-service";
import {
	importKitsuPublicProfile,
	importKitsuXmlFile,
} from "./external-tracking-kitsu-import-service";
import { exportExternalTrackingProvider } from "./external-tracking-manual-export-service";
import { retryExternalTrackingSecretStorage } from "./external-tracking-secret-storage-retry-service";
import { getExternalTrackingSettings } from "./external-tracking-settings-service";

export class ExternalTrackingService {
	public static getSettings(): ExternalTrackingSettings {
		return getExternalTrackingSettings();
	}

	public static retrySecretStorage(): ExternalTrackingSecretStorageStatus {
		return retryExternalTrackingSecretStorage();
	}

	public static async startConnection(request: StartExternalTrackingConnectionRequest): Promise<StartExternalTrackingConnectionResult> {
		return startExternalTrackingConnection(request);
	}

	public static async saveImplicitToken(request: SaveExternalTrackingTokenRequest): Promise<ExternalTrackingAccount> {
		return saveExternalTrackingImplicitToken(request);
	}

	public static async connectKitsu(request: ConnectKitsuPasswordRequest): Promise<ExternalTrackingAccount> {
		return connectKitsuWithPassword(request);
	}

	public static disconnect(provider: ExternalTrackingProvider): ExternalTrackingActionResult {
		return disconnectExternalTrackingProvider(provider);
	}

	public static async importProvider(provider: ExternalTrackingProvider): Promise<ExternalTrackingImportResult> {
		return importExternalTrackingProvider(provider);
	}

	public static async importKitsuPublic(request: ImportKitsuPublicProfileRequest): Promise<ExternalTrackingImportResult> {
		return importKitsuPublicProfile(request);
	}

	public static async importKitsuXml(): Promise<ExternalTrackingImportResult> {
		return importKitsuXmlFile();
	}

	public static async exportToProvider(provider: ExternalTrackingProvider): Promise<ExternalTrackingActionResult> {
		return exportExternalTrackingProvider(provider);
	}
}
