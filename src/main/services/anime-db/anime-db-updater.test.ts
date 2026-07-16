// @vitest-environment node
import type {
	AniListMedia,
	MediaSort,
	PagedResponse,
} from "@nimlat/types/ani-list-media-api";
import type { AnimeDbUpdateState } from "@nimlat/types/anime-db-update";
import type { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

interface UpdaterInstance {
	start(): Promise<void>;

	stop(): Promise<void>;

	getProgress(): AnimeDbUpdateProgressData;
}

const {
				getBaselineMock,
				handleCatalogMediaMutationMock,
				loadUpdateStateMock,
				logMainServiceErrorMock,
				queryAnimeMediasPageMock,
				saveUpdateStateMock,
				upsertMediaMock,
			} = vi.hoisted(() => ({
	getBaselineMock:                vi.fn(),
	handleCatalogMediaMutationMock: vi.fn(),
	loadUpdateStateMock:            vi.fn(),
	logMainServiceErrorMock:        vi.fn(),
	queryAnimeMediasPageMock:       vi.fn(),
	saveUpdateStateMock:            vi.fn(),
	upsertMediaMock:                vi.fn(),
}));

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			media:     {
				upsertMedia: upsertMediaMock,
			},
			scanState: {
				getAnimeDbUpdateBaseline: getBaselineMock,
				loadAnimeDbUpdateState:   loadUpdateStateMock,
				saveAnimeDbUpdateState:   saveUpdateStateMock,
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError: logMainServiceErrorMock,
		},
	}),
);

vi.mock(
	"electron",
	() => ({
		BrowserWindow: {
			getAllWindows: () => [],
		},
		webContents: {
			getAllWebContents: () => [],
		},
	}),
);

vi.mock(
	"../../providers/media-provider-registry",
	() => ({
		MediaProviderRegistry: {
			getAniListMediaProvider: () => ({
				queryAnimeMediasPage: queryAnimeMediasPageMock,
			}),
		},
	}),
);

vi.mock(
	"../library/library-side-effects-coordinator",
	() => ({
		LibrarySideEffectsCoordinator: {
			handleCatalogMediaMutation: handleCatalogMediaMutationMock,
		},
	}),
);

const UPDATE_OVERLAP_SECONDS = 7 * 24 * 60 * 60;

function mediaFixture(id: number, updatedAt: number): AniListMedia {
	return {
		id,
		idMal: null,
		updatedAt,
	} as AniListMedia;
}

function pageResponse(
	currentPage: number,
	medias: AniListMedia[],
	hasNextPage: boolean,
	total: number = 1000,
): PagedResponse<AniListMedia> {
	return {
		Page: {
			pageInfo: {
				total,
				perPage: 50,
				currentPage,
				lastPage: hasNextPage ? currentPage + 1 : currentPage,
				hasNextPage,
			},
			media:    medias,
		},
	};
}

function pageKey(sort: MediaSort[], page: number): string {
	return `${ sort.join(",") }:${ page }`;
}

function mockProviderPages(pages: Record<string, PagedResponse<AniListMedia>>): void {
	queryAnimeMediasPageMock.mockImplementation(({
																								 page,
																								 sort = [ "ID" ],
																							 }: {
		page: number;
		sort?: MediaSort[];
	}) => {
		const response = pages[ pageKey(
			sort,
			page,
		) ];
		if (!response) {
			throw new Error(`Unexpected provider page ${ pageKey(
				sort,
				page,
			) }`);
		}

		return Promise.resolve(response);
	});
}

async function waitForStatus(
	updater: UpdaterInstance,
	status: AnimeDbUpdateProgressData["status"],
): Promise<void> {
	await vi.waitFor(() => {
		expect(updater.getProgress().status).toBe(status);
	});
}

function lastSavedUpdateState(): AnimeDbUpdateState {
	return saveUpdateStateMock.mock.calls.at(-1)?.[ 0 ] as AnimeDbUpdateState;
}

describe(
	"AnimeDbUpdater cursor policy",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			getBaselineMock.mockReturnValue({
				mediaCount: 1000,
				maxProviderUpdatedAt: 2_000_000,
			});
			loadUpdateStateMock.mockReturnValue(null);
			upsertMediaMock.mockReturnValue(undefined);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"replays an updatedAt overlap and sweeps tail ID pages before advancing the cursor",
			async () => {
				mockProviderPages({
					[ pageKey(
						[ "UPDATED_AT_DESC" ],
						1,
					) ]: pageResponse(
						1,
						[
							mediaFixture(
								1100,
								2_000_100,
							),
							mediaFixture(
								1099,
								1_500_000,
							),
						],
						true,
					),
					[ pageKey(
						[ "UPDATED_AT_DESC" ],
						2,
					) ]: pageResponse(
						2,
						[
							mediaFixture(
								1001,
								2_000_250,
							),
							mediaFixture(
								800,
								2_000_000 - UPDATE_OVERLAP_SECONDS - 1,
							),
						],
						true,
					),
					[ pageKey(
						[ "ID" ],
						18,
					) ]: pageResponse(
						18,
						[
							mediaFixture(
								1801,
								1_900_000,
							),
						],
						true,
					),
					[ pageKey(
						[ "ID" ],
						19,
					) ]: pageResponse(
						19,
						[
							mediaFixture(
								1901,
								1_950_000,
							),
						],
						true,
					),
					[ pageKey(
						[ "ID" ],
						20,
					) ]: pageResponse(
						20,
						[
							mediaFixture(
								2001,
								2_000_300,
							),
						],
						false,
					),
				});

				const { AnimeDbUpdater } = await import("./anime-db-updater");
				const updater = AnimeDbUpdater.getInstance() as UpdaterInstance;

				await updater.start();
				await waitForStatus(
					updater,
					"completed",
				);

				expect(queryAnimeMediasPageMock).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						page:         1,
						perPage:      50,
						includeAdult: true,
						sort:         [ "UPDATED_AT_DESC" ],
						priority: "series-hydration",
						context:      expect.objectContaining({
							source: "anime-db-updater",
							page:   1,
							sort:   [ "UPDATED_AT_DESC" ],
						}),
					}),
				);
				expect(queryAnimeMediasPageMock).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({
						page:         18,
						perPage:      50,
						includeAdult: true,
						sort:         [ "ID" ],
						priority: "series-hydration",
						context:      expect.objectContaining({
							source: "anime-db-updater",
							page:   18,
							sort:   [ "ID" ],
						}),
					}),
				);
				expect(upsertMediaMock.mock.calls.map(call => (call[ 0 ] as AniListMedia).id)).toEqual([
					1100,
					1099,
					1001,
					800,
					1801,
					1901,
					2001,
				]);
				expect(saveUpdateStateMock).toHaveBeenCalledWith(expect.objectContaining({
					lastRunStatus:     "running",
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage: 20,
				}));
				expect(lastSavedUpdateState()).toEqual(expect.objectContaining({
					lastRunStatus:     "completed",
					lastSuccessfulProviderUpdatedAt: 2_000_300,
					lastKnownTailPage: 20,
				}));
			},
		);

		it(
			"keeps the previous successful cursor when a media write fails",
			async () => {
				loadUpdateStateMock.mockReturnValue({
					version:                      1,
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage:            20,
					lastSuccessfulRunCompletedAt: 123,
					lastRunStatus:                "completed",
					startedAt:                    100,
					errorMessage:                 null,
					updatedAt:                    123,
				} satisfies AnimeDbUpdateState);
				mockProviderPages({
					[ pageKey(
						[ "UPDATED_AT_DESC" ],
						1,
					) ]: pageResponse(
						1,
						[
							mediaFixture(
								1100,
								2_000_100,
							),
							mediaFixture(
								1101,
								2_000_200,
							),
						],
						false,
					),
				});
				upsertMediaMock.mockImplementation((media: AniListMedia) => {
					if (media.id === 1101) {
						throw new Error("write failed");
					}
				});

				const { AnimeDbUpdater } = await import("./anime-db-updater");
				const updater = AnimeDbUpdater.getInstance() as UpdaterInstance;

				await updater.start();
				await waitForStatus(
					updater,
					"error",
				);

				expect(lastSavedUpdateState()).toEqual(expect.objectContaining({
					lastRunStatus:                "error",
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage:            20,
					lastSuccessfulRunCompletedAt: 123,
				}));
			},
		);

		it(
			"normalizes non-Error media write failures before logging and persisting state",
			async () => {
				loadUpdateStateMock.mockReturnValue({
					version:                         1,
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage:               20,
					lastSuccessfulRunCompletedAt:    123,
					lastRunStatus:                   "completed",
					startedAt:                       100,
					errorMessage:                    null,
					updatedAt:                       123,
				} satisfies AnimeDbUpdateState);
				mockProviderPages({
					[ pageKey(
						[ "UPDATED_AT_DESC" ],
						1,
					) ]: pageResponse(
						1,
						[
							mediaFixture(
								1100,
								2_000_100,
							),
						],
						false,
					),
				});
				upsertMediaMock.mockImplementation(() => {
					throw "write failed";
				});

				const { AnimeDbUpdater } = await import("./anime-db-updater");
				const updater            = AnimeDbUpdater.getInstance() as UpdaterInstance;

				await updater.start();
				await waitForStatus(
					updater,
					"error",
				);

				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.update.run",
					expect.objectContaining({
						message: "write failed",
					}),
				);
				expect(updater.getProgress()).toEqual(expect.objectContaining({
					status:       "error",
					errorMessage: "write failed",
				}));
				expect(lastSavedUpdateState()).toEqual(expect.objectContaining({
					lastRunStatus:                   "error",
					errorMessage:                    "write failed",
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage:               20,
					lastSuccessfulRunCompletedAt:    123,
				}));
			},
		);

		it(
			"pauses with the old cursor when stopped inside a batch",
			async () => {
				let updater: UpdaterInstance | null = null;
				mockProviderPages({
					[ pageKey(
						[ "UPDATED_AT_DESC" ],
						1,
					) ]: pageResponse(
						1,
						[
							mediaFixture(
								1100,
								2_000_100,
							),
							mediaFixture(
								1101,
								2_000_200,
							),
						],
						false,
					),
				});
				upsertMediaMock.mockImplementation((media: AniListMedia) => {
					if (media.id === 1100) {
						void updater?.stop();
					}
				});

				const { AnimeDbUpdater } = await import("./anime-db-updater");
				updater = AnimeDbUpdater.getInstance() as UpdaterInstance;

				await updater.start();
				await waitForStatus(
					updater,
					"paused",
				);

				expect(upsertMediaMock).toHaveBeenCalledTimes(1);
				expect(lastSavedUpdateState()).toEqual(expect.objectContaining({
					lastRunStatus:     "paused",
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage: 20,
				}));
			},
		);

		it(
			"short-circuits recent completed updates without hitting the provider",
			async () => {
				const now = 3_000_000_000;
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(now);
				loadUpdateStateMock.mockReturnValue({
					version:                      1,
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage:            20,
					lastSuccessfulRunCompletedAt: now - 60_000,
					lastRunStatus:                "completed",
					startedAt:                    now - 120_000,
					errorMessage:                 null,
					updatedAt:                    now - 60_000,
				} satisfies AnimeDbUpdateState);

				const { AnimeDbUpdater } = await import("./anime-db-updater");
				const updater = AnimeDbUpdater.getInstance() as UpdaterInstance;

				await updater.start();

				expect(queryAnimeMediasPageMock).not.toHaveBeenCalled();
				expect(upsertMediaMock).not.toHaveBeenCalled();
				expect(saveUpdateStateMock).not.toHaveBeenCalled();
				expect(updater.getProgress()).toEqual(expect.objectContaining({
					status:                       "completed",
					phase:                        "completed",
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastSuccessfulRunCompletedAt: now - 60_000,
					cooldownEndsAt:               now - 60_000 + (24 * 60 * 60 * 1000),
				}));
			},
		);

		it(
			"starts a new update when the completed-run cooldown has expired",
			async () => {
				const now = 3_000_000_000;
				vi.spyOn(
					Date,
					"now",
				).mockReturnValue(now);
				loadUpdateStateMock.mockReturnValue({
					version:                      1,
					lastSuccessfulProviderUpdatedAt: 2_000_000,
					lastKnownTailPage:            20,
					lastSuccessfulRunCompletedAt: now - (25 * 60 * 60 * 1000),
					lastRunStatus:                "completed",
					startedAt:                    now - (26 * 60 * 60 * 1000),
					errorMessage:                 null,
					updatedAt:                    now - (25 * 60 * 60 * 1000),
				} satisfies AnimeDbUpdateState);
				mockProviderPages({
					[ pageKey(
						[ "UPDATED_AT_DESC" ],
						1,
					) ]: pageResponse(
						1,
						[
							mediaFixture(
								1100,
								2_000_100,
							),
						],
						false,
					),
					[ pageKey(
						[ "ID" ],
						18,
					) ]: pageResponse(
						18,
						[],
						false,
					),
				});

				const { AnimeDbUpdater } = await import("./anime-db-updater");
				const updater = AnimeDbUpdater.getInstance() as UpdaterInstance;

				await updater.start();
				await waitForStatus(
					updater,
					"completed",
				);

				expect(queryAnimeMediasPageMock).toHaveBeenCalled();
				expect(upsertMediaMock).toHaveBeenCalledWith(mediaFixture(
					1100,
					2_000_100,
				));
				expect(lastSavedUpdateState()).toEqual(expect.objectContaining({
					lastRunStatus: "completed",
					lastSuccessfulProviderUpdatedAt: 2_000_100,
				}));
			},
		);
	},
);
