// @vitest-environment node
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import type { ExternalTrackingPushItem } from "@nimlat/types/external-tracking";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { AniListTrackingClient } from "./external-tracking-anilist-client";
import { SimklTrackingClient } from "./external-tracking-simkl-client";

function createAccount(provider: "anilist" | "simkl"): ExternalTrackingAccountSecretRow {
	return {
		provider,
		status:                  "connected",
		authKind:                provider === "anilist" ? "implicit" : "pkce",
		clientId:                provider === "simkl" ? "simkl-client" : null,
		accessToken:             "access-token",
		refreshToken:            null,
		tokenExpiresAt:          null,
		publicProfileIdentifier: null,
		pendingCodeVerifier:     null,
		pendingState:            null,
		pendingRedirectUri:      null,
		lastImportedAt:          null,
		lastError:               null,
		updatedAt:               1,
	};
}

function createUnwatchedItem(): ExternalTrackingPushItem {
	return {
		mediaId:             42,
		idAniList:           4242,
		idMal:               2424,
		idSimkl:             "1212",
		isWatched:           false,
		watchedEpisodeCount: 0,
		episodesCount:       12,
	};
}

function jsonResponse(): Response {
	return new Response(
		JSON.stringify({}),
		{
			status:  200,
			headers: { "Content-Type": "application/json" },
		},
	);
}

describe(
	"external tracking provider watch reset",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"exports zero-progress AniList state as PLANNING instead of a nullable status",
			async () => {
				const fetchMock = vi.fn((requestUrl: string | URL | Request, requestInit?: RequestInit) => {
					void requestUrl;
					void requestInit;
					return Promise.resolve(jsonResponse());
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await new AniListTrackingClient().pushWatchedBatch(
					createAccount("anilist"),
					[ createUnwatchedItem() ],
				);

				const body = JSON.parse(String(fetchMock.mock.calls[ 0 ]?.[ 1 ]?.body)) as {
					variables: Record<string, unknown>;
				};
				expect(body.variables).toMatchObject({
					mediaId:  4242,
					progress: 0,
					status:   "PLANNING",
				});
			},
		);

		it(
			"uses SIMKL history removal for a zero-progress unwatched state",
			async () => {
				const fetchMock = vi.fn((requestUrl: string | URL | Request, requestInit?: RequestInit) => {
					void requestUrl;
					void requestInit;
					return Promise.resolve(jsonResponse());
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await new SimklTrackingClient().pushWatchedBatch(
					createAccount("simkl"),
					[ createUnwatchedItem() ],
				);

				expect(fetchMock).toHaveBeenCalledTimes(1);
				expect(fetchMock.mock.calls[ 0 ]?.[ 0 ]).toBe("https://api.simkl.com/sync/history/remove");
				expect(JSON.parse(String(fetchMock.mock.calls[ 0 ]?.[ 1 ]?.body))).toEqual({
					anime: [
						{
							ids: {
								anilist: 4242,
								mal:     2424,
								simkl:   1212,
							},
						},
					],
				});
			},
		);
	},
);
