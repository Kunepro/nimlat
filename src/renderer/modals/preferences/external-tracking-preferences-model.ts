import type {
	ConnectKitsuPasswordRequest,
	ExternalTrackingAccount,
	ExternalTrackingProvider,
	ImportKitsuPublicProfileRequest,
	SaveExternalTrackingTokenRequest,
	StartExternalTrackingConnectionRequest,
} from "@nimlat/types/external-tracking";

export interface ExternalTrackingProviderDraft {
	clientId: string;
	redirectUri: string;
	token: string;
	email: string;
	username: string;
	password: string;
}

export type ExternalTrackingProviderDrafts = Record<ExternalTrackingProvider, ExternalTrackingProviderDraft>;

export type ExternalTrackingActionFeedbackType = "error" | "success";

const EXTERNAL_TRACKING_PROVIDER_ORDER: ExternalTrackingProvider[] = [
	"mal",
	"anilist",
	"simkl",
	"kitsu",
];

const DEFAULT_REDIRECT_URI = "http://127.0.0.1:8765/callback";

export function createDefaultExternalTrackingDrafts(): ExternalTrackingProviderDrafts {
	return {
		mal:     {
			clientId:       "",
			redirectUri:    DEFAULT_REDIRECT_URI,
			token:          "",
			email:    "",
			username: "",
			password: "",
		},
		anilist: {
			clientId:       "",
			redirectUri:    "",
			token:          "",
			email:    "",
			username: "",
			password: "",
		},
		simkl:   {
			clientId:       "",
			redirectUri:    DEFAULT_REDIRECT_URI,
			token:          "",
			email:    "",
			username: "",
			password: "",
		},
		kitsu:   {
			clientId:       "",
			redirectUri:    "",
			token:          "",
			email:    "",
			username: "",
			password: "",
		},
	};
}

export function orderExternalTrackingAccounts(accounts: ExternalTrackingAccount[] | undefined): ExternalTrackingAccount[] {
	// Visibility is the availability signal. Legacy/disabled provider rows stay
	// out of the UI instead of presenting a non-functional integration choice.
	const visibleAccounts = accounts?.filter(account => account.status !== "unsupported");
	const byProvider      = new Map(visibleAccounts?.map(account => [
		account.provider,
		account,
	]));

	return EXTERNAL_TRACKING_PROVIDER_ORDER
		.map(provider => byProvider.get(provider))
		.filter((account): account is ExternalTrackingAccount => Boolean(account));
}

export function mergeExternalTrackingAccountDraftValues(
	drafts: ExternalTrackingProviderDrafts,
	accounts: ExternalTrackingAccount[],
	hydrateKitsuPublicIdentifier = true,
): ExternalTrackingProviderDrafts {
	const nextDrafts = { ...drafts };
	accounts.forEach((account) => {
		const currentDraft             = nextDrafts[ account.provider ];
		nextDrafts[ account.provider ] = {
			...currentDraft,
			clientId: account.clientId ?? currentDraft.clientId,
			username: account.provider === "kitsu" && hydrateKitsuPublicIdentifier
									? account.publicProfileIdentifier ?? currentDraft.username
									: currentDraft.username,
		};
	});

	return nextDrafts;
}

export function createExternalTrackingStartConnectionRequest(
	provider: ExternalTrackingProvider,
	drafts: ExternalTrackingProviderDrafts,
): StartExternalTrackingConnectionRequest {
	const draft = drafts[ provider ];

	return {
		provider,
		clientId:    draft.clientId,
		redirectUri: draft.redirectUri,
	};
}

export function createAniListImplicitTokenRequest(
	drafts: ExternalTrackingProviderDrafts,
): SaveExternalTrackingTokenRequest {
	const draft = drafts.anilist;

	return {
		provider:           "anilist",
		clientId:           draft.clientId,
		tokenOrRedirectUrl: draft.token,
	};
}

export function createKitsuPasswordConnectionRequest(
	drafts: ExternalTrackingProviderDrafts,
): ConnectKitsuPasswordRequest {
	const draft = drafts.kitsu;
	return {
		provider: "kitsu",
		email:    draft.email,
		password: draft.password,
	};
}

export function createAniListImplicitAuthorizationUrl(clientId: string): string {
	// AniList resolves the registered Auth Pin redirect from the OAuth client.
	// Adding redirect_uri here breaks the current implicit-grant flow, so keep
	// this URL aligned with AniList's documented client_id + response_type form.
	const normalizedClientId = clientId.trim();
	if (!normalizedClientId) {
		throw new Error("Enter the AniList client ID before requesting a token.");
	}
	return `https://anilist.co/api/v2/oauth/authorize?client_id=${ encodeURIComponent(normalizedClientId) }&response_type=token`;
}

export function createKitsuPublicProfileImportRequest(
	drafts: ExternalTrackingProviderDrafts,
): ImportKitsuPublicProfileRequest {
	return {
		provider: "kitsu",
		username: drafts.kitsu.username,
	};
}

export function getExternalTrackingActionResultMessage(result: unknown): string | null {
	return result && typeof result === "object" && "message" in result && typeof result.message === "string"
		? result.message
		: null;
}

export function getExternalTrackingActionFeedbackType(result: unknown): ExternalTrackingActionFeedbackType {
	return result && typeof result === "object" && "success" in result && result.success === false
		? "error"
		: "success";
}

export function formatExternalTrackingActionError(error: unknown): string {
	if (!(error instanceof Error)) return "External tracking action failed.";

	// Electron prefixes errors crossing IPC with the channel and main-process
	// class name. Those diagnostics belong in logs, not in user-facing feedback.
	return error.message
		.replace(
			/^Error invoking remote method '[^']+':\s*/u,
			"",
		)
		.replace(
			/^[A-Za-z][A-Za-z0-9]*Error:\s*/u,
			"",
		);
}

export function getExternalTrackingProviderName(provider: ExternalTrackingProvider): string {
	if (provider === "mal") return "MyAnimeList";
	if (provider === "anilist") return "AniList";
	if (provider === "simkl") return "Simkl";
	return "Kitsu";
}

export function getExternalTrackingProviderHint(provider: ExternalTrackingProvider): string {
	if (provider === "mal") {
		return "PKCE connection. Nimlat stores no MAL client secret.";
	}
	if (provider === "anilist") {
		return "Connect AniList to import or export your watch history.";
	}
	if (provider === "simkl") {
		return "PKCE connection through a public Simkl app.";
	}

	return "Import a file, pull a public profile, or send local watch updates to Kitsu.";
}

export function formatExternalTrackingTimestamp(value?: number | null): string {
	if (!value) {
		return "Never";
	}

	return new Date(value).toLocaleString();
}

export function getExternalTrackingStatusColor(account: ExternalTrackingAccount): string {
	if (account.status === "connected") return "green";
	if (account.status === "needs_reconnect") return "orange";
	if (account.status === "unsupported") return "default";
	return "blue";
}

export function getExternalTrackingStatusLabel(account: ExternalTrackingAccount): string {
	return account.status.replace(
		"_",
		" ",
	);
}

export function isExternalTrackingAccountConnected(account: ExternalTrackingAccount): boolean {
	return account.status === "connected";
}

export function isExternalTrackingAccountUnsupported(account: ExternalTrackingAccount): boolean {
	return account.status === "unsupported";
}

function isExternalTrackingProvider(value: string): value is ExternalTrackingProvider {
	return EXTERNAL_TRACKING_PROVIDER_ORDER.includes(value as ExternalTrackingProvider);
}

export function normalizeOpenExternalTrackingProviderKeys(keys: string | string[]): ExternalTrackingProvider[] {
	return (Array.isArray(keys) ? keys : [ keys ]).filter(isExternalTrackingProvider);
}
