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
import { MyAnimeListTrackingClient } from "./external-tracking-mal-client";

function createAccount(): ExternalTrackingAccountSecretRow {
	return {
		provider:                "mal",
		status:                  "connected",
		authKind:                "pkce",
		clientId:                "mal-client",
		accessToken:             "access-token",
		refreshToken:            "refresh-token",
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

function jsonResponse(body: unknown): Response {
	return new Response(
		JSON.stringify(body),
		{
			status:  200,
			headers: { "Content-Type": "application/json" },
		},
	);
}

function createPushItem(patch: Partial<ExternalTrackingPushItem>): ExternalTrackingPushItem {
	return {
		mediaId:             1,
		idMal:               1535,
		isWatched:           false,
		watchedEpisodeCount: 0,
		episodesCount:       12,
		...patch,
	};
}

describe(
	"MyAnimeListTrackingClient",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"imports MAL as binary watched state without inferring episode identities",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(() => Promise.resolve(jsonResponse({
						data:   [
							{
								node:        {
									id:           1535,
									num_episodes: 37,
								},
								list_status: {
									status:               "watching",
									num_episodes_watched: 22,
									updated_at:           "2026-07-18T10:00:00Z",
								},
							},
							{
								node:        {
									id:           5114,
									num_episodes: 64,
								},
								list_status: {
									status:               "completed",
									num_episodes_watched: 64,
								},
							},
							{
								node:        {
									id:           9253,
									num_episodes: 0,
								},
								list_status: {
									status:               "plan_to_watch",
									num_episodes_watched: 0,
								},
							},
						],
						paging: {},
					}))),
				);

				await expect(new MyAnimeListTrackingClient().importWatched(createAccount())).resolves.toEqual([
					expect.objectContaining({
						idMal:               1535,
						isWatched:           false,
						watchedEpisodeCount: 0,
						episodesCount:       37,
						rawStatus:           "watching",
					}),
					expect.objectContaining({
						idMal:               5114,
						isWatched:           true,
						watchedEpisodeCount: 64,
						episodesCount:       64,
						rawStatus:           "completed",
					}),
					expect.objectContaining({
						idMal:               9253,
						isWatched:           false,
						watchedEpisodeCount: 0,
						episodesCount:       undefined,
						rawStatus:           "plan_to_watch",
					}),
				]);
			},
		);

		it(
			"exports only binary MAL state when episode identities are unavailable",
			async () => {
				const fetchMock = vi.fn((requestUrl: string | URL | Request, requestInit?: RequestInit) => {
					void requestUrl;
					void requestInit;
					return Promise.resolve(jsonResponse({}));
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await new MyAnimeListTrackingClient().pushWatchedBatch(
					createAccount(),
					[
						createPushItem({ watchedEpisodeCount: 3 }),
						createPushItem({
							idMal:               9253,
							isWatched:           true,
							watchedEpisodeCount: 3,
						}),
						createPushItem({
							idMal:         5114,
							episodesCount: 1,
						}),
					],
				);

				const bodies = fetchMock.mock.calls.map((call) => call[ 1 ]?.body as URLSearchParams);
				expect(Array.from(bodies[ 0 ]?.entries() ?? [])).toEqual([
					[
						"num_watched_episodes",
						"0",
					],
					[
						"status",
						"plan_to_watch",
					],
				]);
				expect(Array.from(bodies[ 1 ]?.entries() ?? [])).toEqual([
					[
						"num_watched_episodes",
						"12",
					],
					[
						"status",
						"completed",
					],
				]);
				expect(Array.from(bodies[ 2 ]?.entries() ?? [])).toEqual([
					[
						"num_watched_episodes",
						"0",
					],
					[
						"status",
						"plan_to_watch",
					],
				]);
			},
		);
	},
);
