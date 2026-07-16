// @vitest-environment node
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { getExternalTrackingProviderClient } from "./external-tracking-provider-clients";

vi.mock(
	"@nimlat/busses/main",
	() => ({ BUS_ExternalTrackingAccountsChanged: { next: vi.fn() } }),
);

vi.mock(
	"@nimlat/database",
	() => ({ UserDbFacade: { externalTracking: { completeAccount: vi.fn() } } }),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({ encryptExternalTrackingSecret: (value: string | null) => value }),
);

function createAniListAccount(accessToken: string | null): ExternalTrackingAccountSecretRow {
	return {
		provider:            "anilist",
		status:              "connected",
		authKind:            "implicit",
		clientId:            null,
		accessToken,
		refreshToken:        null,
		tokenExpiresAt:      null,
		publicProfileIdentifier: null,
		pendingCodeVerifier: null,
		pendingState:        null,
		pendingRedirectUri:  null,
		lastImportedAt:      null,
		lastError:           null,
		updatedAt:           1,
	};
}

function mockJsonFetch(payload: unknown): void {
	vi.stubGlobal(
		"fetch",
		vi.fn(() => Promise.resolve({
			ok:         true,
			status:     200,
			statusText: "OK",
			text:       () => Promise.resolve(JSON.stringify(payload)),
		} as Response)),
	);
}

describe(
	"external tracking provider clients",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"validates AniList implicit tokens with a Viewer request",
			async () => {
				mockJsonFetch({ data: { Viewer: { id: 123 } } });

				await expect(getExternalTrackingProviderClient("anilist").testConnection?.(createAniListAccount("token"))).resolves.toBeUndefined();

				expect(fetch).toHaveBeenCalledWith(
					"https://graphql.anilist.co",
					expect.objectContaining({
						method: "POST",
						headers: expect.objectContaining({ Authorization: "Bearer token" }),
					}),
				);
			},
		);

		it(
			"rejects AniList implicit tokens when the Viewer request is not authenticated",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(() => Promise.resolve({
						ok:         false,
						status:     401,
						statusText: "Unauthorized",
						text:       () => Promise.resolve("bad token"),
					} as Response)),
				);

				await expect(getExternalTrackingProviderClient("anilist").testConnection?.(createAniListAccount("bad-token"))).rejects.toThrow(/401/u);
			},
		);
	},
);
