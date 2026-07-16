import type {
	ConnectKitsuPasswordRequest,
	ExternalTrackingAccount,
	ExternalTrackingAccountsChangedEvent,
	ExternalTrackingActionResult,
	ExternalTrackingExportProgressEvent,
	ExternalTrackingImportResult,
	ExternalTrackingProvider,
	ExternalTrackingSecretStorageStatus,
	ExternalTrackingSettings,
	ImportKitsuPublicProfileRequest,
	SaveExternalTrackingTokenRequest,
	StartExternalTrackingConnectionRequest,
	StartExternalTrackingConnectionResult,
} from "./external-tracking";

// External tracking providers cross an auth boundary. The preload contract stays
// command/event shaped while token persistence and provider behavior remain in main.
export interface ExternalTrackingElectronApi {
	getSettings(): Promise<ExternalTrackingSettings>;

	retrySecretStorage(): Promise<ExternalTrackingSecretStorageStatus>;

	startConnection(request: StartExternalTrackingConnectionRequest): Promise<StartExternalTrackingConnectionResult>;

	saveImplicitToken(request: SaveExternalTrackingTokenRequest): Promise<ExternalTrackingAccount>;

	connectKitsu(request: ConnectKitsuPasswordRequest): Promise<ExternalTrackingAccount>;

	disconnect(provider: ExternalTrackingProvider): Promise<ExternalTrackingActionResult>;

	importProvider(provider: ExternalTrackingProvider): Promise<ExternalTrackingImportResult>;

	importKitsuPublic(request: ImportKitsuPublicProfileRequest): Promise<ExternalTrackingImportResult>;

	importKitsuXml(): Promise<ExternalTrackingImportResult>;

	exportProvider(provider: ExternalTrackingProvider): Promise<ExternalTrackingActionResult>;

	onAccountsChanged(callback: (event: ExternalTrackingAccountsChangedEvent) => void): () => void;

	onExportProgress(callback: (event: ExternalTrackingExportProgressEvent) => void): () => void;
}
