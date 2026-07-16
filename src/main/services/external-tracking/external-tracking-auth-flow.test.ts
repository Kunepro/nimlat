// @vitest-environment node
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	exchangeExternalTrackingPkceCode,
	getExternalTrackingJwtExpiresAt,
	parseExternalTrackingImplicitTokenOrRaw,
	parseExternalTrackingPkceRedirect,
	prepareExternalTrackingPkceConnection,
} from "./external-tracking-auth-flow";

describe(
	"external-tracking-auth-flow",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"builds a MyAnimeList PKCE authorization URL with a plain challenge",
			() => {
				const connection = prepareExternalTrackingPkceConnection({
					provider:    "mal",
					clientId:    "  mal-client  ",
					redirectUri: " nimlat://tracking/callback ",
				});
				const authUrl    = new URL(connection.authUrl);

				expect(connection.provider).toBe("mal");
				expect(connection.clientId).toBe("mal-client");
				expect(connection.redirectUri).toBe("nimlat://tracking/callback");
				expect(connection.codeVerifier.length).toBeGreaterThan(40);
				expect(connection.state.length).toBeGreaterThan(20);
				expect(authUrl.origin + authUrl.pathname).toBe("https://myanimelist.net/v1/oauth2/authorize");
				expect(authUrl.searchParams.get("client_id")).toBe("mal-client");
				expect(authUrl.searchParams.get("redirect_uri")).toBe("nimlat://tracking/callback");
				expect(authUrl.searchParams.get("state")).toBe(connection.state);
				expect(authUrl.searchParams.get("code_challenge")).toBe(connection.codeVerifier);
				expect(authUrl.searchParams.get("code_challenge_method")).toBe("plain");
			},
		);

		it(
			"builds a Simkl PKCE authorization URL with an S256 challenge",
			() => {
				const connection = prepareExternalTrackingPkceConnection({
					provider:    "simkl",
					clientId:    "simkl-client",
					redirectUri: "nimlat://tracking/callback",
				});
				const authUrl    = new URL(connection.authUrl);

				expect(authUrl.origin + authUrl.pathname).toBe("https://simkl.com/oauth/authorize");
				expect(authUrl.searchParams.get("state")).toBe(connection.state);
				expect(authUrl.searchParams.get("code_challenge")).not.toBe(connection.codeVerifier);
				expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
			},
		);

		it(
			"parses implicit tokens from redirects and raw pasted tokens",
			() => {
				expect(parseExternalTrackingImplicitTokenOrRaw("nimlat://tracking/callback#access_token=ani-token&expires_in=3600")).toEqual({
					token:            "ani-token",
					expiresInSeconds: 3600,
				});

				expect(parseExternalTrackingImplicitTokenOrRaw("  raw-token  ")).toEqual({
					token:            "raw-token",
					expiresInSeconds: null,
				});
			},
		);

		it(
			"validates PKCE redirect state before returning the authorization code",
			() => {
				expect(parseExternalTrackingPkceRedirect({
					provider: "simkl",
					redirectResult: "code=oauth-code&state=expected-state",
					expectedState:  "expected-state",
				})).toEqual({ code: "oauth-code" });

				expect(() => parseExternalTrackingPkceRedirect({
					provider: "simkl",
					redirectResult: "code=oauth-code&state=wrong-state",
					expectedState:  "expected-state",
				})).toThrow(/mismatched OAuth state/u);
			},
		);

		it(
			"exchanges PKCE authorization codes through the provider token endpoint",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(() => Promise.resolve({
						ok:     true,
						status: 200,
						text:   () => Promise.resolve(JSON.stringify({
							access_token:  "access-token",
							refresh_token: "refresh-token",
							expires_in:    3600,
						})),
					} as Response)),
				);

				const response  = await exchangeExternalTrackingPkceCode({
					provider:     "simkl",
					clientId:     "client",
					code:         "code",
					codeVerifier: "verifier",
					redirectUri:  "nimlat://tracking/callback",
				});
				const fetchCall = vi.mocked(fetch).mock.calls[ 0 ];
				const body      = fetchCall?.[ 1 ]?.body as URLSearchParams;

				expect(fetchCall?.[ 0 ]).toBe("https://api.simkl.com/oauth/token");
				expect(body.get("grant_type")).toBe("authorization_code");
				expect(body.get("code_verifier")).toBe("verifier");
				expect(response).toEqual({
					access_token:  "access-token",
					refresh_token: "refresh-token",
					expires_in:    3600,
				});
			},
		);

		it(
			"reads an AniList token expiry from JWT metadata without trusting malformed tokens",
			() => {
				const payload = Buffer.from(JSON.stringify({ exp: 1_750_000_000 }))
					.toString("base64url");

				expect(getExternalTrackingJwtExpiresAt(`header.${ payload }.signature`)).toBe(1_750_000_000_000);
				expect(getExternalTrackingJwtExpiresAt("not-a-jwt")).toBeNull();
				expect(getExternalTrackingJwtExpiresAt("header.invalid.signature")).toBeNull();
			},
		);

		it(
			"explains that MAL desktop PKCE requires an App Type other client",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(() => Promise.resolve({
						ok:     false,
						status: 401,
						text:   () => Promise.resolve("{\"error\":\"invalid_client\",\"message\":\"Client authentication failed\"}"),
					} as Response)),
				);

				await expect(exchangeExternalTrackingPkceCode({
					provider:     "mal",
					clientId:     "web-client",
					code:         "code",
					codeVerifier: "verifier",
					redirectUri:  "http://127.0.0.1:8765/callback",
				})).rejects.toThrow(/App Type other/u);
			},
		);
	},
);
