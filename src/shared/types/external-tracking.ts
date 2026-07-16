import type { MediaId } from "./nimlat-ids";

export type ExternalTrackingProvider =
	| "mal"
	| "anilist"
	| "simkl"
	| "kitsu";

export type ExternalTrackingProviderStatus =
	| "available"
	| "connected"
	| "needs_reconnect"
	| "unsupported";

export type ExternalTrackingAuthKind =
	| "pkce"
	| "implicit"
	| "password"
	| "unsupported";

export type ExternalTrackingSecretStorageSecurity =
	| "os_encrypted"
	| "access_required"
	| "plaintext";

export interface ExternalTrackingSecretStorageStatus {
	security: ExternalTrackingSecretStorageSecurity;
	encryptionAvailable: boolean;
	backend?: string | null;
	backendLabel: string;
	checkedAt: number;
	retryAvailable: boolean;
	plaintextSecretsStored?: boolean;
	storagePath?: string | null;
	message: string;
	warning?: string | null;
}

export interface ExternalTrackingProviderCapabilities {
	canImport: boolean;
	canExport: boolean;
	supportsEpisodeProgress: boolean;
	authKind: ExternalTrackingAuthKind;
}

export interface ExternalTrackingAccount {
	provider: ExternalTrackingProvider;
	status: ExternalTrackingProviderStatus;
	publicProfileIdentifier?: string | null;
	clientId?: string | null;
	tokenExpiresAt?: number | null;
	lastImportedAt?: number | null;
	lastError?: string | null;
	capabilities: ExternalTrackingProviderCapabilities;
}

export interface ExternalTrackingSettings {
	accounts: ExternalTrackingAccount[];
	secretStorage: ExternalTrackingSecretStorageStatus;
}

export interface StartExternalTrackingConnectionRequest {
	provider: ExternalTrackingProvider;
	clientId: string;
	redirectUri: string;
}

export interface StartExternalTrackingConnectionResult {
	provider: ExternalTrackingProvider;
	authUrl: string;
	state: string;
}

export interface SaveExternalTrackingTokenRequest {
	provider: Extract<ExternalTrackingProvider, "anilist">;
	clientId: string;
	tokenOrRedirectUrl: string;
	expiresInSeconds?: number | null;
}

export interface ConnectKitsuPasswordRequest {
	provider: "kitsu";
	email: string;
	password: string;
}

export interface ImportKitsuPublicProfileRequest {
	provider: "kitsu";
	username: string;
}

export interface ExternalTrackingActionResult {
	success: boolean;
	message?: string;
}

export interface ExternalTrackingImportResult extends ExternalTrackingActionResult {
	importedItems: number;
	matchedItems: number;
	localUpdatedItems: number;
}

export interface MediaWatchListChangedEvent {
	mediaIds: MediaId[];
}

export interface ExternalTrackingEpisodeState {
	episodeNumber: number;
	isWatched: boolean;
	watchedAt?: number | null;
}

export interface ExternalTrackingAccountsChangedEvent {
	provider?: ExternalTrackingProvider;
}

export interface ExternalTrackingExportProgressEvent {
	provider: ExternalTrackingProvider;
	completedItems: number;
	totalItems: number;
	active: boolean;
}

export interface ExternalTrackingImportedMedia {
	mediaId?: MediaId;
	providerMediaId?: string | null;
	idAniList?: number | null;
	idMal?: number | null;
	idKitsu?: string | null;
	idSimkl?: string | null;
	isWatched: boolean;
	// An aggregate count never identifies episodes. Granular imports must supply
	// episodeStates with explicit episode numbers.
	watchedEpisodeCount: number;
	episodeStates?: ExternalTrackingEpisodeState[];
	episodesCount?: number | null;
	watchedAt?: number | null;
	rawStatus?: string | null;
}

export interface ExternalTrackingPushItem {
	mediaId: MediaId;
	providerMediaId?: string | null;
	idAniList?: number | null;
	idMal?: number | null;
	idKitsu?: string | null;
	idSimkl?: string | null;
	isWatched: boolean;
	// Export clients must not expand this count into [1..N]. Providers that
	// support exact episode updates consume episodeStates instead.
	watchedEpisodeCount: number;
	episodeStates?: ExternalTrackingEpisodeState[];
	episodesCount?: number | null;
}

// Pending exports carry the exact dirty revision read before the remote call.
// Acknowledgement must match it so an in-flight export cannot erase a newer toggle.
export interface ExternalTrackingPendingExportItem extends ExternalTrackingPushItem {
	pendingExportRevision: number;
}
