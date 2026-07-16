import type {
	ExternalTrackingProvider,
	StartExternalTrackingConnectionRequest,
} from "@nimlat/types/external-tracking";
import {
	createHash,
	randomBytes,
} from "node:crypto";

interface TokenResponse {
	access_token?: unknown;
	refresh_token?: unknown;
	expires_in?: unknown;
}

type PkceTrackingProvider = Extract<ExternalTrackingProvider, "mal" | "simkl">;

export interface PreparedPkceConnection {
	provider: PkceTrackingProvider;
	clientId: string;
	codeVerifier: string;
	redirectUri: string;
	state: string;
	authUrl: string;
}

export interface ParsedImplicitToken {
	token: string;
	expiresInSeconds: number | null;
}

export interface ParsedPkceRedirect {
	code: string;
}

export function sanitizeExternalTrackingInput(value: string): string {
	return value.trim();
}

export function getExternalTrackingProviderLabel(provider: ExternalTrackingProvider): string {
	if (provider === "mal") return "MyAnimeList";
	if (provider === "anilist") return "AniList";
	if (provider === "simkl") return "Simkl";
	return "Kitsu";
}

export function getExternalTrackingTokenExpiresAt(expiresIn: unknown): number | null {
	return typeof expiresIn === "number" && Number.isFinite(expiresIn)
		? Date.now() + expiresIn * 1000
		: null;
}

export function getExternalTrackingJwtExpiresAt(token: string): number | null {
	// AniList issues JWT access tokens. Reading exp is safe for display and
	// persistence metadata; API authentication still decides whether the token
	// itself is valid, so this deliberately performs no signature verification.
	const payloadSegment = token.split(".")[ 1 ];
	if (!payloadSegment) {
		return null;
	}
	try {
		const payload: unknown = JSON.parse(Buffer.from(
			payloadSegment,
			"base64url",
		).toString("utf8"));
		if (typeof payload !== "object" || payload === null || !("exp" in payload)) {
			return null;
		}
		const expirationSeconds = payload.exp;
		return typeof expirationSeconds === "number" && Number.isFinite(expirationSeconds) && expirationSeconds > 0
			? expirationSeconds * 1000
			: null;
	} catch {
		return null;
	}
}

export function prepareExternalTrackingPkceConnection(request: StartExternalTrackingConnectionRequest): PreparedPkceConnection {
	if (request.provider === "anilist") {
		throw new Error("AniList uses the implicit token flow in Nimlat; paste the returned access token instead.");
	}
	if (request.provider === "kitsu") {
		throw new Error("Kitsu account connection is not enabled until its public-client auth flow is verified.");
	}

	const clientId    = sanitizeExternalTrackingInput(request.clientId);
	const redirectUri = sanitizeExternalTrackingInput(request.redirectUri);
	if (clientId.length === 0 || redirectUri.length === 0) {
		throw new Error(`${ getExternalTrackingProviderLabel(request.provider) } requires a client ID and redirect URI.`);
	}

	const codeVerifier = createCodeVerifier();
	const state        = createState();
	const authUrl      = new URL(request.provider === "mal"
		? "https://myanimelist.net/v1/oauth2/authorize"
		: "https://simkl.com/oauth/authorize");
	authUrl.searchParams.set(
		"response_type",
		"code",
	);
	authUrl.searchParams.set(
		"client_id",
		clientId,
	);
	authUrl.searchParams.set(
		"redirect_uri",
		redirectUri,
	);
	authUrl.searchParams.set(
		"state",
		state,
	);
	authUrl.searchParams.set(
		"code_challenge",
		request.provider === "mal" ? codeVerifier : createSimklCodeChallenge(codeVerifier),
	);
	authUrl.searchParams.set(
		"code_challenge_method",
		request.provider === "mal" ? "plain" : "S256",
	);

	return {
		provider: request.provider,
		clientId,
		codeVerifier,
		redirectUri,
		state,
		authUrl:  authUrl.toString(),
	};
}

export function parseExternalTrackingImplicitTokenOrRaw(tokenOrRedirectUrl: string): ParsedImplicitToken {
	const fallbackToken = sanitizeExternalTrackingInput(tokenOrRedirectUrl);
	if (fallbackToken.length === 0) {
		throw new Error("AniList token cannot be empty.");
	}

	const parsed                 = readExternalTrackingRedirectResult(tokenOrRedirectUrl);
	const rawExpiresIn           = getQueryOrHashParam(
		parsed,
		"expires_in",
	);
	const parsedExpiresInSeconds = Number(rawExpiresIn);

	return {
		token:            getQueryOrHashParam(
			parsed,
			"access_token",
		) ?? fallbackToken,
		expiresInSeconds: rawExpiresIn != null && Number.isFinite(parsedExpiresInSeconds)
												? parsedExpiresInSeconds
												: null,
	};
}

export function parseExternalTrackingPkceRedirect(params: {
	provider: PkceTrackingProvider;
	redirectResult: string;
	expectedState?: string | null;
}): ParsedPkceRedirect {
	const parsed = readExternalTrackingRedirectResult(params.redirectResult);
	const state  = getQueryOrHashParam(
		parsed,
		"state",
	);
	if (params.expectedState && state !== params.expectedState) {
		throw new Error(`${ getExternalTrackingProviderLabel(params.provider) } returned a mismatched OAuth state.`);
	}

	const code = getQueryOrHashParam(
		parsed,
		"code",
	);
	if (!code) {
		throw new Error(`${ getExternalTrackingProviderLabel(params.provider) } redirect did not include an authorization code.`);
	}

	return { code };
}

export async function exchangeExternalTrackingPkceCode(params: {
	provider: PkceTrackingProvider;
	clientId: string;
	code: string;
	codeVerifier: string;
	redirectUri: string;
}): Promise<TokenResponse> {
	const body = new URLSearchParams();
	body.set(
		"client_id",
		params.clientId,
	);
	body.set(
		"code",
		params.code,
	);
	body.set(
		"code_verifier",
		params.codeVerifier,
	);
	body.set(
		"redirect_uri",
		params.redirectUri,
	);
	body.set(
		"grant_type",
		"authorization_code",
	);

	const response = await fetch(
		params.provider === "mal"
			? "https://myanimelist.net/v1/oauth2/token"
			: "https://api.simkl.com/oauth/token",
		{
			method:  "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept:         "application/json",
			},
			body,
		},
	);
	const text     = await response.text();
	if (!response.ok) {
		if (params.provider === "mal" && response.status === 401 && text.includes("invalid_client")) {
			throw new Error("MyAnimeList rejected this Client ID. Create the MAL API client with App Type other, enter the new Client ID in Nimlat, then connect again.");
		}
		throw new Error(`${ getExternalTrackingProviderLabel(params.provider) } token exchange failed with ${ response.status }: ${ text.slice(
			0,
			500,
		) }`);
	}

	return asTokenResponse(JSON.parse(text) as unknown);
}

function readExternalTrackingRedirectResult(value: string): URL {
	const text = sanitizeExternalTrackingInput(value);
	if (text.length === 0) {
		throw new Error("Paste the redirect URL or token result before completing the connection.");
	}
	try {
		return new URL(text);
	} catch {
		return new URL(`nimlat://tracking/callback?${ text.replace(
			/^#/u,
			"",
		) }`);
	}
}

function getQueryOrHashParam(url: URL, key: string): string | null {
	const direct = url.searchParams.get(key);
	if (direct) {
		return direct;
	}

	const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
	return new URLSearchParams(hash).get(key);
}

function base64Url(buffer: Buffer): string {
	return buffer.toString("base64")
		.replaceAll(
			"+",
			"-",
		)
		.replaceAll(
			"/",
			"_",
		)
		.replace(
			/=+$/u,
			"",
		);
}

function createCodeVerifier(): string {
	return base64Url(randomBytes(48));
}

function createState(): string {
	return base64Url(randomBytes(32));
}

function createSimklCodeChallenge(verifier: string): string {
	return base64Url(createHash("sha256")
		.update(verifier)
		.digest());
}

function asTokenResponse(value: unknown): TokenResponse {
	return typeof value === "object" && value !== null ? value as TokenResponse : {};
}
