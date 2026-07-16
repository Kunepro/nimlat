import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import type { ExternalTrackingProviderDraft } from "./external-tracking-preferences-model";
import {
	getExternalTrackingProviderName,
	isExternalTrackingAccountConnected,
	isExternalTrackingAccountUnsupported,
} from "./external-tracking-preferences-model";

export type ExternalTrackingCredentialMode = "anilist-token" | "kitsu-password" | "pkce";

export interface ExternalTrackingProviderPanelViewModel {
	actionDisabled: boolean;
	connected: boolean;
	credentialMode: ExternalTrackingCredentialMode;
	disabled: boolean;
	integrated: boolean;
	providerName: string;
}

export interface ExternalTrackingProviderPanelActions {
	connectKitsu: () => void;
	importKitsuPublic: () => void;
	importKitsuXml: () => void;
	disconnect: (provider: ExternalTrackingProvider) => void;
	exportProvider: (provider: ExternalTrackingProvider) => void;
	importProvider: (provider: ExternalTrackingProvider) => void;
	requestAniListToken: () => void;
	saveAniListToken: () => void;
	startConnection: (provider: ExternalTrackingProvider) => void;
	updateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
}

// Keeps provider panel branching testable and outside the JSX surface. Kitsu and
// future providers can add modes here without growing component conditionals.
export function createExternalTrackingProviderPanelViewModel(account: ExternalTrackingAccount): ExternalTrackingProviderPanelViewModel {
	const connected = isExternalTrackingAccountConnected(account);
	const disabled  = isExternalTrackingAccountUnsupported(account);
	// Kitsu public imports are a durable integration even without a token. Require
	// both the saved identifier and a completed import so an unverified draft or a
	// failed first attempt cannot light the switch. Token-only actions still use
	// `connected` below and therefore remain unavailable for public imports.
	const hasSuccessfulKitsuPublicImport = account.provider === "kitsu"
		&& Boolean(account.publicProfileIdentifier?.trim())
		&& typeof account.lastImportedAt === "number"
		&& Number.isFinite(account.lastImportedAt)
		&& account.lastImportedAt > 0;

	return {
		actionDisabled: disabled || !connected,
		connected,
		credentialMode: account.provider === "anilist"
											? "anilist-token"
											: account.provider === "kitsu" ? "kitsu-password" : "pkce",
		disabled,
		integrated:     connected || hasSuccessfulKitsuPublicImport,
		providerName:   getExternalTrackingProviderName(account.provider),
	};
}
