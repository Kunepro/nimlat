// @vitest-environment node
import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";
import type { ExternalTrackingPushItem } from "@nimlat/types/external-tracking";
import {
	lastValueFrom,
	toArray,
} from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { KitsuTrackingClient } from "./external-tracking-kitsu-client";

vi.mock(
	"@nimlat/busses/main",
	() => ({ BUS_ExternalTrackingAccountsChanged: { next: vi.fn() } }),
);

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			externalTracking: { completeAccount: vi.fn() },
		},
	}),
);

vi.mock(
	"./external-tracking-secret-storage",
	() => ({ encryptExternalTrackingSecret: (value: string | null) => value }),
);

function createAccount(): ExternalTrackingAccountSecretRow {
	return {
		provider:                "kitsu",
		status:                  "connected",
		authKind:                "password",
		clientId:                null,
		accessToken:             "access-token",
		refreshToken:            "refresh-token",
		tokenExpiresAt:          Date.now() + 3_600_000,
		publicProfileIdentifier: "kitsu-user",
		pendingCodeVerifier:     null,
		pendingState:            null,
		pendingRedirectUri:      null,
		lastImportedAt:          null,
		lastError:               null,
		updatedAt:               1,
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(
		JSON.stringify(body),
		{
			status,
			headers: { "Content-Type": "application/json" },
		},
	);
}

function publicLibraryResponse(): Response {
	return jsonResponse({
		data:     [
			{
				type:          "libraryEntries",
				id:            "99",
				attributes:    {
					status:   "current",
					progress: 4,
				},
				relationships: {
					anime: {
						data: {
							type: "anime",
							id:   "7",
						},
					},
				},
			},
		],
		included: [
			{
				type:          "anime",
				id:            "7",
				attributes:    { episodeCount: 12 },
				relationships: { mappings: { data: [] } },
			},
		],
		links:    { next: null },
	});
}

describe(
	"KitsuTrackingClient",
	() => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"imports the authenticated library with Kitsu, MAL, and AniList identifiers",
			async () => {
				const fetchMock = vi.fn()
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type: "users",
								id:   "42",
							},
						],
					}))
					.mockResolvedValueOnce(jsonResponse({
						data:     [
							{
								type:          "libraryEntries",
								id:            "99",
								attributes:    {
									status:       "completed",
									progress:     37,
									finishedAt:   "2026-07-01T10:00:00Z",
									progressedAt: "2026-06-30T10:00:00Z",
								},
								relationships: {
									anime: {
										data: {
											type: "anime",
											id:   "7",
										},
									},
								},
							},
						],
						included: [
							{
								type:          "anime",
								id:            "7",
								attributes:    { episodeCount: 37 },
								relationships: {
									mappings: {
										data: [
											{
												type: "mappings",
												id:   "mal-map",
											},
											{
												type: "mappings",
												id:   "anilist-map",
											},
										],
									},
								},
							},
							{
								type:       "mappings",
								id:         "mal-map",
								attributes: {
									externalSite: "myanimelist/anime",
									externalId:   "1535",
								},
							},
							{
								type:       "mappings",
								id:         "anilist-map",
								attributes: {
									externalSite: "anilist/anime",
									externalId:   "1535",
								},
							},
						],
						links:    { next: null },
					}));
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await expect(new KitsuTrackingClient().importWatched(createAccount())).resolves.toEqual([
					expect.objectContaining({
						providerMediaId:     "7",
						idKitsu:             "7",
						idMal:               1535,
						idAniList:           1535,
						isWatched:           true,
						watchedEpisodeCount: 37,
						episodesCount:       37,
					}),
				]);
				expect(fetchMock).toHaveBeenCalledTimes(2);
				expect(fetchMock.mock.calls[ 1 ]?.[ 0 ]).toContain("filter%5BuserId%5D=42");
			},
		);

		it(
			"discards aggregate-only partial progress from a public library",
			async () => {
				const fetchMock = vi.fn()
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type: "users",
								id:   "42",
							},
						],
					}))
					.mockResolvedValueOnce(publicLibraryResponse());
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await expect(new KitsuTrackingClient().importPublicProfile(" public-user ")).resolves.toEqual([
					expect.objectContaining({
						providerMediaId:     "7",
						watchedEpisodeCount: 0,
						isWatched:           false,
					}),
				]);
				expect(fetchMock.mock.calls[ 0 ]?.[ 0 ]).toContain("filter%5Bslug%5D=public-user");
				for (const call of fetchMock.mock.calls) {
					const headers = new Headers((call[ 1 ] as RequestInit | undefined)?.headers);
					expect(headers.has("Authorization")).toBe(false);
				}
			},
		);

		it(
			"falls back to an exact Kitsu name when a public profile has no slug",
			async () => {
				const fetchMock = vi.fn()
					.mockResolvedValueOnce(jsonResponse({ data: [] }))
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type:       "users",
								id:         "1732935",
								attributes: {
									name: "Dzhalagash",
									slug: null,
								},
							},
						],
					}))
					.mockResolvedValueOnce(publicLibraryResponse());
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await expect(new KitsuTrackingClient().importPublicProfile("Dzhalagash")).resolves.toHaveLength(1);
				expect(fetchMock.mock.calls[ 0 ]?.[ 0 ]).toContain("filter%5Bslug%5D=Dzhalagash");
				expect(fetchMock.mock.calls[ 1 ]?.[ 0 ]).toContain("filter%5Bname%5D=Dzhalagash");
				expect(fetchMock.mock.calls[ 2 ]?.[ 0 ]).toContain("filter%5BuserId%5D=1732935");
			},
		);

		it(
			"imports a public Kitsu profile directly by numeric user id",
			async () => {
				const fetchMock = vi.fn()
					.mockResolvedValueOnce(jsonResponse({
						data: {
							type: "users",
							id:   "1732935",
						},
					}))
					.mockResolvedValueOnce(publicLibraryResponse());
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await expect(new KitsuTrackingClient().importPublicProfile("1732935")).resolves.toHaveLength(1);
				expect(fetchMock.mock.calls[ 0 ]?.[ 0 ]).toBe("https://kitsu.io/api/edge/users/1732935");
				expect(fetchMock.mock.calls[ 1 ]?.[ 0 ]).toContain("filter%5BuserId%5D=1732935");
				expect(fetchMock.mock.calls.every(call => !String(call[ 0 ]).includes("filter%5Bslug%5D"))).toBe(true);
			},
		);

		it(
			"resolves a MAL id to Kitsu and patches an existing library entry",
			async () => {
				const fetchMock = vi.fn()
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type: "users",
								id:   "42",
							},
						],
					}))
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type:          "mappings",
								id:            "map-1",
								attributes:    { externalId: "1535" },
								relationships: {
									item: {
										data: {
											type: "anime",
											id:   "7",
										},
									},
								},
							},
						],
					}))
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type:          "libraryEntries",
								id:            "99",
								relationships: {
									anime: {
										data: {
											type: "anime",
											id:   "7",
										},
									},
								},
							},
						],
					}))
					.mockResolvedValueOnce(jsonResponse({
						data: {
							type: "libraryEntries",
							id:   "99",
						},
					}));
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);
				const item = {
					mediaId:             1,
					providerMediaId:     null,
					idMal:               1535,
					isWatched:           true,
					watchedEpisodeCount: 37,
				};

				await new KitsuTrackingClient().pushWatchedBatch(
					createAccount(),
					[ item ],
				);

				expect(item).toMatchObject({
					idKitsu:         "7",
					providerMediaId: "7",
				});
				const mappingUrl = new URL(String(fetchMock.mock.calls[ 1 ]?.[ 0 ]));
				expect(mappingUrl.searchParams.get("page[limit]")).toBe("1");
				expect(mappingUrl.searchParams.get("include")).toBe("item");
				expect(mappingUrl.searchParams.get("fields[anime]")).toBe("id");
				const existingEntriesUrl = String(fetchMock.mock.calls[ 2 ]?.[ 0 ]);
				expect(existingEntriesUrl).toContain("include=anime");
				expect(existingEntriesUrl).toContain("fields%5Banime%5D=id");
				const [ mutationUrl, mutationInit ] = fetchMock.mock.calls[ 3 ] as [ string, RequestInit ];
				expect(mutationUrl).toBe("https://kitsu.io/api/edge/library-entries/99");
				expect(mutationInit.method).toBe("PATCH");
				expect(JSON.parse(mutationInit.body as string)).toEqual({
					data: {
						type:       "libraryEntries",
						id:         "99",
						attributes: {
							status:   "completed",
							progress: 37,
						},
					},
				});
			},
		);

		it(
			"uses a cached Kitsu id without requesting mappings again",
			async () => {
				const fetchMock = vi.fn()
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type: "users",
								id:   "42",
							},
						],
					}))
					.mockResolvedValueOnce(jsonResponse({ data: [] }))
					.mockResolvedValueOnce(jsonResponse({
						data: {
							type: "libraryEntries",
							id:   "100",
						},
					}));
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);
				const item = {
					mediaId:             1,
					providerMediaId:     "7",
					idMal:               1_535,
					idAniList:           1_535,
					isWatched:           true,
					watchedEpisodeCount: 37,
				};

				await new KitsuTrackingClient().pushWatchedBatch(
					createAccount(),
					[ item ],
				);

				expect(item).toMatchObject({
					idKitsu:         "7",
					providerMediaId: "7",
				});
				expect(fetchMock).toHaveBeenCalledTimes(3);
				expect(fetchMock.mock.calls.every(call => !String(call[ 0 ]).includes("/mappings"))).toBe(true);
				const [ mutationUrl, mutationInit ] = fetchMock.mock.calls[ 2 ] as [ string, RequestInit ];
				expect(mutationUrl).toBe("https://kitsu.io/api/edge/library-entries");
				expect(mutationInit.method).toBe("POST");
				expect(JSON.parse(mutationInit.body as string)).toEqual({
					data: {
						type:          "libraryEntries",
						attributes:    {
							status:   "completed",
							progress: 37,
						},
						relationships: {
							user:  {
								data: {
									type: "users",
									id:   "42",
								},
							},
							anime: {
								data: {
									type: "anime",
									id:   "7",
								},
							},
						},
					},
				});
			},
		);

		it(
			"falls back to AniList when Kitsu has no MAL mapping",
			async () => {
				const fetchMock = vi.fn()
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type: "users",
								id:   "42",
							},
						],
					}))
					.mockResolvedValueOnce(jsonResponse({ data: [] }))
					.mockResolvedValueOnce(jsonResponse({
						data: [
							{
								type:          "mappings",
								id:            "map-2",
								attributes:    { externalId: "2468" },
								relationships: {
									item: {
										data: {
											type: "anime",
											id:   "8",
										},
									},
								},
							},
						],
					}))
					.mockResolvedValueOnce(jsonResponse({ data: [] }))
					.mockResolvedValueOnce(jsonResponse({
						data: {
							type: "libraryEntries",
							id:   "101",
						},
					}));
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);
				const item = {
					mediaId:             2,
					providerMediaId:     null,
					idMal:               1_357,
					idAniList:           2_468,
					isWatched:           false,
					watchedEpisodeCount: 4,
				};

				await new KitsuTrackingClient().pushWatchedBatch(
					createAccount(),
					[ item ],
				);

				expect(item).toMatchObject({
					idKitsu:         "8",
					providerMediaId: "8",
				});
				expect(String(fetchMock.mock.calls[ 1 ]?.[ 0 ])).toContain("myanimelist%2Fanime");
				expect(String(fetchMock.mock.calls[ 2 ]?.[ 0 ])).toContain("anilist%2Fanime");
				const mutationBody = JSON.parse(fetchMock.mock.calls[ 4 ]?.[ 1 ]?.body as string);
				expect(mutationBody.data.attributes).toEqual({
					status:   "planned",
					progress: 0,
				});
			},
		);

		it(
			"resolves mapping exports in batches accepted by Kitsu",
			async () => {
				const items: ExternalTrackingPushItem[] = Array.from(
					{ length: 21 },
					(_, index) => ({
						mediaId:             index + 1,
						providerMediaId:     null,
						idMal:               10_000 + index,
						isWatched:           true,
						watchedEpisodeCount: 12,
					}),
				);
				const fetchMock                         = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
					const url = new URL(String(input));
					if (url.pathname === "/api/edge/users") {
						return jsonResponse({
							data: [
								{
									type: "users",
									id:   "42",
								},
							],
						});
					}
					if (url.pathname === "/api/edge/mappings") {
						const ids = url.searchParams.get("filter[externalId]")?.split(",") ?? [];
						return jsonResponse({
							data: ids.map(id => ({
								type:          "mappings",
								id:            `mapping-${ id }`,
								attributes:    { externalId: id },
								relationships: {
									item: {
										data: {
											type: "anime",
											id:   `anime-${ id }`,
										},
									},
								},
							})),
						});
					}
					if (url.pathname === "/api/edge/library-entries" && !init?.method) {
						const ids = url.searchParams.get("filter[animeId]")?.split(",") ?? [];
						return jsonResponse({
							data: ids.map(id => ({
								type:          "libraryEntries",
								id:            `entry-${ id }`,
								relationships: {
									anime: {
										data: {
											type: "anime",
											id,
										},
									},
								},
							})),
						});
					}
					return jsonResponse({
						data: {
							type: "libraryEntries",
							id:   url.pathname.split("/").at(-1),
						},
					});
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				const progressEvents = await lastValueFrom(new KitsuTrackingClient().streamWatchedBatchPush(
					createAccount(),
					items,
				).pipe(toArray()));

				const mappingUrls = fetchMock.mock.calls
					.filter(([ input ]) => String(input).includes("/mappings?"))
					.map(([ input ]) => new URL(String(input)));
				expect(mappingUrls).toHaveLength(2);
				expect(mappingUrls.map(url => url.searchParams.get("page[limit]"))).toEqual([
					"20",
					"1",
				]);
				expect(mappingUrls.map(url => url.searchParams.get("filter[externalId]")?.split(",").length)).toEqual([
					20,
					1,
				]);
				expect(mappingUrls.every(url => url.searchParams.get("include") === "item")).toBe(true);
				expect(items.every(item => item.idKitsu?.startsWith("anime-"))).toBe(true);
				expect(progressEvents).toHaveLength(21);
				expect(progressEvents.at(-1)).toEqual({
					completedItems: 21,
					totalItems:     21,
				});
			},
		);

		it(
			"bounds existing-entry lookup URLs before patching a large export",
			async () => {
				const items     = Array.from(
					{ length: 101 },
					(_, index) => ({
						mediaId:             index + 1,
						providerMediaId:     String(index + 1),
						isWatched:           false,
						watchedEpisodeCount: 0,
					}),
				);
				const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
					const url = new URL(String(input));
					if (url.pathname === "/api/edge/users") {
						return jsonResponse({
							data: [
								{
									type: "users",
									id:   "42",
								},
							],
						});
					}
					if (url.pathname === "/api/edge/library-entries" && !init?.method) {
						const ids = url.searchParams.get("filter[animeId]")?.split(",") ?? [];
						return jsonResponse({
							data: ids.map(id => ({
								type:          "libraryEntries",
								id:            `entry-${ id }`,
								relationships: {
									anime: {
										data: {
											type: "anime",
											id,
										},
									},
								},
							})),
						});
					}
					return jsonResponse({
						data: {
							type: "libraryEntries",
							id:   url.pathname.split("/").at(-1),
						},
					});
				});
				vi.stubGlobal(
					"fetch",
					fetchMock,
				);

				await new KitsuTrackingClient().pushWatchedBatch(
					createAccount(),
					items,
				);

				const lookupUrls = fetchMock.mock.calls
					.filter(([ input, init ]) => !init?.method && String(input).includes("/library-entries?"))
					.map(([ input ]) => new URL(String(input)));
				expect(lookupUrls).toHaveLength(2);
				expect(lookupUrls.map(url => url.searchParams.get("filter[animeId]")?.split(",").length)).toEqual([
					100,
					1,
				]);
				expect(fetchMock.mock.calls.filter(([ , init ]) => init?.method === "PATCH")).toHaveLength(101);
			},
		);
	},
);
