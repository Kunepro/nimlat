import { BUS_ExternalTrackingAccountsChanged } from "@nimlat/busses/main";
import {
	type ExternalTrackingAccountSecretRow,
	UserDbFacade,
} from "@nimlat/database";
import {
	asNumber,
	asRecord,
	asString,
	ExternalTrackingAuthenticationError,
	fetchJson,
	getExternalTrackingHttpStatus,
} from "./external-tracking-client-utils";
import { encryptExternalTrackingSecret } from "./external-tracking-secret-storage";

const KITSU_TOKEN_URL          = "https://kitsu.io/api/oauth/token";
const TOKEN_EXPIRY_HEADROOM_MS = 60_000;

interface KitsuTokenSet {
	accessToken: string;
	refreshToken: string | null;
	tokenExpiresAt: number | null;
}

function parseKitsuTokenSet(value: unknown): KitsuTokenSet {
	const record       = asRecord(value);
	const accessToken  = asString(record.access_token);
	const refreshToken = asString(record.refresh_token);
	const expiresIn    = asNumber(record.expires_in);
	if (!accessToken) {
		throw new Error("Kitsu did not return an access token.");
	}

	return {
		accessToken,
		refreshToken,
		tokenExpiresAt: expiresIn == null ? null : Date.now() + expiresIn * 1000,
	};
}

async function exchangeKitsuToken(body: URLSearchParams): Promise<KitsuTokenSet> {
	return parseKitsuTokenSet(await fetchJson(
		KITSU_TOKEN_URL,
		{
			method:  "POST",
			headers: {
				Accept:         "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body,
		},
	));
}

// Kitsu's password grant necessarily receives the password once. The caller
// must keep it transient; this function only returns revocable OAuth tokens.
export async function exchangeKitsuPassword(email: string, password: string): Promise<KitsuTokenSet> {
	const body = new URLSearchParams();
	body.set(
		"grant_type",
		"password",
	);
	// OAuth calls this field `username`, but Kitsu's supported password flow
	// authenticates with the account email. Keep that distinction at our API/UI boundary.
	body.set(
		"username",
		email,
	);
	body.set(
		"password",
		password,
	);
	try {
		return await exchangeKitsuToken(body);
	} catch (error) {
		const status = getExternalTrackingHttpStatus(error);
		if (status === 400 || status === 401) {
			throw new ExternalTrackingAuthenticationError("Kitsu did not accept that email and password. Check both and try again.");
		}
		if (status === 429) {
			throw new ExternalTrackingAuthenticationError("Too many Kitsu sign-in attempts. Wait a moment and try again.");
		}
		throw error;
	}
}

async function refreshKitsuToken(refreshToken: string): Promise<KitsuTokenSet> {
	const body = new URLSearchParams();
	body.set(
		"grant_type",
		"refresh_token",
	);
	body.set(
		"refresh_token",
		refreshToken,
	);
	return exchangeKitsuToken(body);
}

// Provider clients receive decrypted rows. Mutating this private main-process
// copy after refresh keeps the current operation on the new token while the DB
// receives only OS-encrypted values.
export async function ensureKitsuAccessToken(
	account: ExternalTrackingAccountSecretRow,
	forceRefresh = false,
): Promise<string> {
	const tokenStillValid = account.accessToken
		&& (!account.tokenExpiresAt || account.tokenExpiresAt > Date.now() + TOKEN_EXPIRY_HEADROOM_MS);
	if (!forceRefresh && tokenStillValid) {
		return account.accessToken as string;
	}
	if (!account.refreshToken) {
		throw new ExternalTrackingAuthenticationError("Kitsu refresh token is missing. Reconnect the account.");
	}

	let refreshed: KitsuTokenSet;
	try {
		refreshed = await refreshKitsuToken(account.refreshToken);
	} catch (error) {
		const status = getExternalTrackingHttpStatus(error);
		if (status === 400 || status === 401) {
			throw new ExternalTrackingAuthenticationError("Kitsu rejected the saved refresh token. Reconnect the account.");
		}
		throw error;
	}
	const effectiveRefreshToken = refreshed.refreshToken ?? account.refreshToken;
	UserDbFacade.externalTracking.completeAccount({
		provider:       "kitsu",
		authKind:       "password",
		clientId:       null,
		accessToken:    encryptExternalTrackingSecret(refreshed.accessToken) ?? "",
		refreshToken:   encryptExternalTrackingSecret(effectiveRefreshToken),
		tokenExpiresAt: refreshed.tokenExpiresAt,
	});
	account.accessToken    = refreshed.accessToken;
	account.refreshToken   = effectiveRefreshToken;
	account.tokenExpiresAt = refreshed.tokenExpiresAt;
	BUS_ExternalTrackingAccountsChanged.next({ provider: "kitsu" });
	return refreshed.accessToken;
}
