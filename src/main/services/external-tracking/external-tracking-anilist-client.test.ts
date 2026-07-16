// @vitest-environment node
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { AniListTrackingClient } from "./external-tracking-anilist-client";

function createAccount(): ExternalTrackingAccountSecretRow {
	return {
		provider:                "anilist",
		status:                  "connected",
		authKind:                "implicit",
		clientId:                "anilist-client",
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
	"AniListTrackingClient",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"discards aggregate-only partial progress but imports completed state",
			async () => {
				vi.stubGlobal(
					"fetch",
					vi.fn()
						.mockResolvedValueOnce(jsonResponse({ data: { Viewer: { id: 7 } } }))
						.mockResolvedValueOnce(jsonResponse({
							data: {
								Page: {
									pageInfo:  { hasNextPage: false },
									mediaList: [
										{
											mediaId:  20_907,
											status:   "CURRENT",
											progress: 2,
											media:    {
												id:       20_907,
												idMal:    27_957,
												episodes: 4,
											},
										},
										{
											mediaId:  9_253,
											status:   "COMPLETED",
											progress: 24,
											media:    {
												id:       9_253,
												idMal:    9_253,
												episodes: 24,
											},
										},
									],
								},
							},
						})),
				);

				await expect(new AniListTrackingClient().importWatched(createAccount())).resolves.toEqual([
					expect.objectContaining({
						idAniList:           20_907,
						isWatched:           false,
						watchedEpisodeCount: 0,
					}),
					expect.objectContaining({
						idAniList:           9_253,
						isWatched:           true,
						watchedEpisodeCount: 24,
					}),
				]);
			},
		);

		it(
			"exports AniList progress as binary media state",
			async () => {
				const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
					void input;
					void init;
					return Promise.resolve(jsonResponse({ data: { SaveMediaListEntry: { id: 1 } } }));
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await new AniListTrackingClient().pushWatchedBatch(
					createAccount(),
					[
						{
							mediaId:             20_907,
							idAniList:           20_907,
							isWatched:           false,
							watchedEpisodeCount: 2,
							episodesCount:       4,
						},
						{
							mediaId:             9_253,
							idAniList:           9_253,
							isWatched:           true,
							watchedEpisodeCount: 24,
							episodesCount:       24,
						},
					],
				);

				const variables = fetchMock.mock.calls.map(call => JSON.parse(call[ 1 ]?.body as string).variables);
				expect(variables).toEqual([
					{
						mediaId:  20_907,
						progress: 0,
						status:   "PLANNING",
					},
					{
						mediaId:  9_253,
						progress: 24,
						status:   "COMPLETED",
					},
				]);
			},
		);
	},
);
