// @vitest-environment node
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { SimklTrackingClient } from "./external-tracking-simkl-client";

function createAccount(): ExternalTrackingAccountSecretRow {
	return {
		provider:                "simkl",
		status:                  "connected",
		authKind:                "pkce",
		clientId:                "simkl-client",
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

function jsonResponse(body: unknown): Response {
	return new Response(
		JSON.stringify(body),
		{
			status:  200,
			headers: { "Content-Type": "application/json" },
		},
	);
}

describe(
	"SimklTrackingClient",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"imports a fully watched anime from identifiers nested under show",
			async () => {
				const fetchMock = vi.fn((requestUrl: string | URL | Request) => {
					void requestUrl;
					return Promise.resolve(jsonResponse({
						anime: [
							{
								status:                 "completed",
								watched_episodes_count: 4,
								total_episodes_count:   4,
								last_watched_at:        "2026-07-20T21:38:07Z",
								show:                   {
									title: "Steins;Gate: The Sagacious Wisdom of Cognitive Computing",
									ids:   {
										simkl:   427444,
										mal:     "27957",
										anilist: "20907",
									},
								},
							},
						],
					}));
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await expect(new SimklTrackingClient().importWatched(createAccount())).resolves.toEqual([
					expect.objectContaining({
						providerMediaId:     "427444",
						idSimkl:             "427444",
						idMal:               27957,
						idAniList:           20907,
						isWatched:           true,
						watchedEpisodeCount: 4,
						episodesCount:       4,
						rawStatus:           "completed",
					}),
				]);
				expect(fetchMock.mock.calls[ 0 ]?.[ 0 ]).toBe(
					"https://api.simkl.com/sync/all-items/anime?extended=full&include_all_episodes=yes&episode_watched_at=yes",
				);
			},
		);

		it(
			"imports sparse Simkl progress only from explicit episode numbers",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn(() => Promise.resolve(jsonResponse({
						anime: [
							{
								status:                 "watching",
								watched_episodes_count: 2,
								total_episodes_count:   4,
								show:                   {
									ids: {
										simkl:   427444,
										anilist: "20907",
									},
								},
								seasons:                [
									{
										number:   1,
										episodes: [
											{
												number:     1,
												watched_at: "2026-07-18T10:00:00Z",
											},
											{
												number:     2,
												watched_at: null,
											},
											{
												number:     3,
												watched_at: null,
											},
											{
												number:     4,
												watched_at: "2026-07-20T10:00:00Z",
											},
										],
									},
								],
							},
						],
					}))),
				);

				await expect(new SimklTrackingClient().importWatched(createAccount())).resolves.toEqual([
					expect.objectContaining({
						isWatched:           false,
						watchedEpisodeCount: 2,
						episodeStates:       [
							{
								episodeNumber: 1,
								isWatched:     true,
								watchedAt:     Date.parse("2026-07-18T10:00:00Z"),
							},
							{
								episodeNumber: 2,
								isWatched:     false,
								watchedAt:     null,
							},
							{
								episodeNumber: 3,
								isWatched:     false,
								watchedAt:     null,
							},
							{
								episodeNumber: 4,
								isWatched:     true,
								watchedAt:     Date.parse("2026-07-20T10:00:00Z"),
							},
						],
					}),
				]);
			},
		);

		it(
			"exports exact Simkl episode numbers instead of expanding an aggregate count",
			async () => {
				const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
					void input;
					void init;
					return Promise.resolve(jsonResponse({}));
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await new SimklTrackingClient().pushWatchedBatch(
					createAccount(),
					[
						{
							mediaId:             20_907,
							idSimkl:             "427444",
							isWatched:           false,
							watchedEpisodeCount: 2,
							episodeStates:       [
								{
									episodeNumber: 1,
									isWatched:     true,
								},
								{
									episodeNumber: 2,
									isWatched:     false,
								},
								{
									episodeNumber: 4,
									isWatched:     true,
								},
							],
						},
						{
							mediaId:             9_253,
							idSimkl:             "38960",
							isWatched:           false,
							watchedEpisodeCount: 3,
						},
					],
				);

				expect(fetchMock).toHaveBeenCalledTimes(2);
				expect(JSON.parse(fetchMock.mock.calls[ 0 ]?.[ 1 ]?.body as string)).toEqual({
					anime: [
						{ ids: { simkl: 427444 } },
						{ ids: { simkl: 38960 } },
					],
				});
				expect(JSON.parse(fetchMock.mock.calls[ 1 ]?.[ 1 ]?.body as string)).toEqual({
					anime: [
						{
							ids:      { simkl: 427444 },
							episodes: [
								1,
								4,
							],
						},
					],
				});
			},
		);
	},
);
