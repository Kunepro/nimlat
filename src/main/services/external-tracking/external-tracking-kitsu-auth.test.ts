// @vitest-environment node
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	accountsChangedNext: vi.fn(),
	completeAccount:     vi.fn(),
}));

vi.mock(
	"@nimlat/busses/main",
	() => ({ BUS_ExternalTrackingAccountsChanged: { next: mocks.accountsChangedNext } }),
);

vi.mock(
	"@nimlat/database",
	() => ({ UserDbFacade: { externalTracking: { completeAccount: mocks.completeAccount } } }),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({
		encryptExternalTrackingSecret: (value: string | null) => value ? `encrypted:${ value }` : null,
	}),
);

function createExpiredAccount(): ExternalTrackingAccountSecretRow {
	return {
		provider:                "kitsu",
		status:                  "connected",
		authKind:                "password",
		clientId:                null,
		accessToken:             "old-access",
		refreshToken:            "old-refresh",
		tokenExpiresAt:          1,
		publicProfileIdentifier: "kitsu-user",
		pendingCodeVerifier:     null,
		pendingState:            null,
		pendingRedirectUri:      null,
		lastImportedAt:          null,
		lastError:               null,
		updatedAt:               1,
	};
}

describe(
	"Kitsu authentication",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.clearAllMocks();
		});

		it(
			"uses the account email for the password grant and explains rejected credentials",
			async () => {
				const fetchMock = vi.fn().mockResolvedValue(new Response(
					JSON.stringify({
						error:             "invalid_grant",
						error_description: "The provided authorization grant is invalid.",
					}),
					{
						status:     400,
						statusText: "Bad Request",
					},
				));
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);
				const { exchangeKitsuPassword } = await import("./external-tracking-kitsu-auth");

				await expect(exchangeKitsuPassword(
					"user@example.com",
					"temporary-password",
				)).rejects.toThrow("Kitsu did not accept that email and password. Check both and try again.");
				const body = fetchMock.mock.calls[ 0 ]?.[ 1 ]?.body as URLSearchParams;
				expect(body.get("grant_type")).toBe("password");
				expect(body.get("username")).toBe("user@example.com");
				expect(body.get("password")).toBe("temporary-password");
			},
		);

		it(
			"classifies a rejected refresh token as a reconnect requirement",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn().mockResolvedValue(new Response(
						"invalid grant",
						{
							status:     401,
							statusText: "Unauthorized",
						},
					)),
				);
				const { ensureKitsuAccessToken }              = await import("./external-tracking-kitsu-auth");
				const { ExternalTrackingAuthenticationError } = await import("./external-tracking-client-utils");

				await expect(ensureKitsuAccessToken(createExpiredAccount())).rejects.toBeInstanceOf(ExternalTrackingAuthenticationError);
			},
		);

		it(
			"refreshes an expired token and persists only encrypted replacements",
			async () => {
				const fetchMock = vi.fn().mockResolvedValue(new Response(
					JSON.stringify({
						access_token:  "new-access",
						refresh_token: "new-refresh",
						expires_in:    3600,
					}),
					{ status: 200 },
				));
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);
				const account                    = createExpiredAccount();
				const { ensureKitsuAccessToken } = await import("./external-tracking-kitsu-auth");

				await expect(ensureKitsuAccessToken(account)).resolves.toBe("new-access");
				expect(mocks.completeAccount).toHaveBeenCalledWith(expect.objectContaining({
					provider:     "kitsu",
					authKind:     "password",
					accessToken:  "encrypted:new-access",
					refreshToken: "encrypted:new-refresh",
				}));
				expect(account.accessToken).toBe("new-access");
				expect(account.refreshToken).toBe("new-refresh");
				expect(mocks.accountsChangedNext).toHaveBeenCalledWith({ provider: "kitsu" });
				const body = fetchMock.mock.calls[ 0 ]?.[ 1 ]?.body as URLSearchParams;
				expect(body.get("grant_type")).toBe("refresh_token");
				expect(body.get("refresh_token")).toBe("old-refresh");
			},
		);
	},
);
