import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import type {
	ExternalTrackingImportedMedia,
	ExternalTrackingProvider,
	ExternalTrackingProviderCapabilities,
	ExternalTrackingPushItem,
} from "@nimlat/types/external-tracking";
import type { Observable } from "rxjs";

export interface ExternalTrackingPushProgressEvent {
	completedItems: number;
	totalItems: number;
}

export interface ExternalTrackingProviderClient {
	provider: ExternalTrackingProvider;

	testConnection?(account: ExternalTrackingAccountSecretRow): Promise<void>;

	importWatched(account: ExternalTrackingAccountSecretRow): Promise<ExternalTrackingImportedMedia[]>;

	pushWatchedBatch(
		account: ExternalTrackingAccountSecretRow,
		items: ExternalTrackingPushItem[],
	): Promise<void>;

	streamWatchedBatchPush?(
		account: ExternalTrackingAccountSecretRow,
		items: ExternalTrackingPushItem[],
	): Observable<ExternalTrackingPushProgressEvent>;
}

export const EXTERNAL_TRACKING_PROVIDER_CAPABILITIES: Record<ExternalTrackingProvider, ExternalTrackingProviderCapabilities> = {
	mal: {
		canImport:               true,
		canExport:               true,
		supportsEpisodeProgress: false,
		authKind:                "pkce",
	},
	anilist: {
		canImport:               true,
		canExport:               true,
		supportsEpisodeProgress: false,
		authKind:                "implicit",
	},
	simkl: {
		canImport:               true,
		canExport: true,
		supportsEpisodeProgress: true,
		authKind:                "pkce",
	},
	kitsu: {
		canImport: true,
		canExport: true,
		supportsEpisodeProgress: false,
		authKind:  "password",
	},
};
