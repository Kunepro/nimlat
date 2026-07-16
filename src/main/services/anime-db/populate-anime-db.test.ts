// @vitest-environment node
import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { AniListMediasScanBatch } from "./ani-list-media-scanner";

interface AnimeDbScanCheckpointFixture {
	version: 2;
	lastCompletedPage: number;
	lastPersistedMediaId: number;
	updatedAt: number;
}

interface PopulatorInstance {
	start(startPage?: number): Promise<void>;

	stop(): Promise<void>;

	getProgress(): PopulateAnimeDbProgressData;
}

const {
				clearCheckpointMock,
				computeGroupsForNewMediaMock,
				isDevModeEnabledMock,
				loadCheckpointMock,
				getAnimeDbUpdateBaselineMock,
				getAnimeDbVersionMock,
				logMainServiceErrorMock,
				saveCheckpointMock,
				scanAllMediasMock,
				setAnimeDbVersionMock,
				upsertMediaMock,
			} = vi.hoisted(() => ({
	clearCheckpointMock:          vi.fn(),
	computeGroupsForNewMediaMock: vi.fn(),
	isDevModeEnabledMock:         vi.fn(),
	loadCheckpointMock:           vi.fn(),
	getAnimeDbUpdateBaselineMock: vi.fn(),
	getAnimeDbVersionMock: vi.fn(),
	logMainServiceErrorMock:      vi.fn(),
	saveCheckpointMock:           vi.fn(),
	scanAllMediasMock:            vi.fn(),
	setAnimeDbVersionMock:        vi.fn(),
	upsertMediaMock:              vi.fn(),
}));

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade: {
			media:     {
				upsertMedia: upsertMediaMock,
			},
			scanState: {
				saveAnimeDbScanCheckpoint:  saveCheckpointMock,
				loadAnimeDbScanCheckpoint:  loadCheckpointMock,
				clearAnimeDbScanCheckpoint: clearCheckpointMock,
				getAnimeDbUpdateBaseline: getAnimeDbUpdateBaselineMock,
			},
		},
		UserDbFacade:  {
			config: {
				getAnimeDbVersion: getAnimeDbVersionMock,
				isDevModeEnabled: isDevModeEnabledMock,
				setAnimeDbVersion: setAnimeDbVersionMock,
			},
		},
	}),
);

vi.mock(
	"../../utils/compute-group-for-new-media/compute-group-for-new-media",
	() => ({
		computeGroupsForNewMedia: computeGroupsForNewMediaMock,
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
	"./ani-list-media-scanner",
	() => ({
		scanAllMedias: scanAllMediasMock,
	}),
);

function mediaFixture(id: number): AniListMedia {
	return { id } as AniListMedia;
}

function scanBatchFixture(
	currentPage: number,
	mediaIds: number[],
	hasNextPage: boolean,
	requestCount = 1,
): AniListMediasScanBatch {
	return {
		medias:   mediaIds.map(mediaFixture),
		pageInfo: {
			total:   currentPage * 50,
			perPage: 50,
			currentPage,
			lastPage: currentPage + (hasNextPage ? 1 : 0),
			hasNextPage,
		},
		requestCount,
		currentPage,
		batchMaxId: Math.max(
			0,
			...mediaIds,
		),
	};
}

function scanBatches(...batches: AniListMediasScanBatch[]) {
	return async function* scanBatchGenerator(): AsyncGenerator<AniListMediasScanBatch> {
		for (const batch of batches) {
			yield batch;
		}
	};
}

function failedScan(error: Error) {
	return async function* failedScanGenerator(): AsyncGenerator<AniListMediasScanBatch> {
		// noinspection JSMismatchedCollectionQueryUpdate
		const noBatches: AniListMediasScanBatch[] = [];
		for (const batch of noBatches) {
			yield batch;
		}
		throw error;
	};
}

function createDeferred(): {
	promise: Promise<void>;
	resolve: () => void;
} {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});

	return {
		promise,
		resolve,
	};
}

function scanBatchesThenWait(
	batch: AniListMediasScanBatch,
	deferred: { promise: Promise<void> },
) {
	return async function* scanBatchGenerator(): AsyncGenerator<AniListMediasScanBatch> {
		yield batch;
		await deferred.promise;
	};
}

async function waitForStatus(
	populator: PopulatorInstance,
	status: PopulateAnimeDbProgressData["currentStatus"],
): Promise<void> {
	await vi.waitFor(() => {
		expect(populator.getProgress().currentStatus).toBe(status);
	});
}

describe(
	"AnimeDbPopulator checkpoint recovery",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			isDevModeEnabledMock.mockReturnValue(true);
			loadCheckpointMock.mockReturnValue(null);
			getAnimeDbVersionMock.mockReturnValue(null);
			getAnimeDbUpdateBaselineMock.mockReturnValue({
				mediaCount:           0,
				maxProviderUpdatedAt: null,
			});
			upsertMediaMock.mockImplementation((media: AniListMedia) => media.id);
		});

		it(
			"preserves the installed release baseline when a full scan completes",
			async () => {
				getAnimeDbVersionMock.mockReturnValue("anime-db-v2026.07.02");
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					1,
					[ 101 ],
					false,
				)));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await waitForStatus(
					populator,
					"completed",
				);

				expect(setAnimeDbVersionMock).not.toHaveBeenCalled();
			},
		);

		it(
			"marks a catalog built without a downloaded release as a full scan",
			async () => {
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					1,
					[ 101 ],
					false,
				)));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await waitForStatus(
					populator,
					"completed",
				);

				expect(setAnimeDbVersionMock).toHaveBeenCalledWith("anilist-full-scan");
			},
		);

		it(
			"resumes from the last committed AniList id",
			async () => {
				loadCheckpointMock.mockReturnValue({
					version:           2,
					lastCompletedPage: 4,
					lastPersistedMediaId: 450,
					updatedAt:         1,
				} satisfies AnimeDbScanCheckpointFixture);
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					5,
					[ 501 ],
					false,
				)));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await waitForStatus(
					populator,
					"completed",
				);

				expect(scanAllMediasMock).toHaveBeenCalledWith(
					450,
					true,
					50,
				);
				expect(saveCheckpointMock).toHaveBeenCalledWith(expect.objectContaining({
					lastCompletedPage: 5,
					lastPersistedMediaId: 501,
				}));
				expect(populator.getProgress()).toEqual(expect.objectContaining({
					currentPage:  5,
					requestBatch: 1,
				}));
			},
		);

		it(
			"initializes resumed progress from the persisted media count",
			async () => {
				loadCheckpointMock.mockReturnValue({
					version:           2,
					lastCompletedPage: 4,
					lastPersistedMediaId: 222,
					updatedAt:         1,
				} satisfies AnimeDbScanCheckpointFixture);
				getAnimeDbUpdateBaselineMock.mockReturnValue({
					mediaCount: 200,
					maxProviderUpdatedAt: null,
				});
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					5,
					[ 223 ],
					false,
				)));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				expect(populator.getProgress()).toEqual(expect.objectContaining({
					currentPage:     5,
					processedMedias: 200,
					totalMedias:     19395,
					totalMediasIsLowerBound: true,
					lastProcessedId: 222,
				}));

				await populator.start();
				await waitForStatus(
					populator,
					"completed",
				);

				expect(populator.getProgress().processedMedias).toBe(201);
			},
		);

		it(
			"keeps scanned totals marked as a lower bound until the ID-window scan completes",
			async () => {
				const deferred = createDeferred();
				scanAllMediasMock.mockImplementation(scanBatchesThenWait(
					scanBatchFixture(
						1,
						[ 101 ],
						false,
					),
					deferred,
				));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await vi.waitFor(() => {
					expect(populator.getProgress()).toEqual(expect.objectContaining({
						currentStatus: "running",
						requestBatch:  1,
						totalMediasIsLowerBound: true,
					}));
				});

				deferred.resolve();
				await waitForStatus(
					populator,
					"completed",
				);
				expect(populator.getProgress().totalMediasIsLowerBound).toBe(false);
			},
		);

		it(
			"raises the saved-title denominator above the official lower bound as media are saved",
			async () => {
				loadCheckpointMock.mockReturnValue({
					version:              2,
					lastCompletedPage:    20,
					lastPersistedMediaId: 1000,
					updatedAt:            1,
				} satisfies AnimeDbScanCheckpointFixture);
				getAnimeDbUpdateBaselineMock.mockReturnValue({
					mediaCount:           19394,
					maxProviderUpdatedAt: null,
				});
				const deferred = createDeferred();
				scanAllMediasMock.mockImplementation(scanBatchesThenWait(
					{
						...scanBatchFixture(
							1,
							[
								1001,
								1002,
							],
							false,
						),
						pageInfo: {
							total:       19395,
							perPage:     50,
							currentPage: 1,
							lastPage:    1,
							hasNextPage: false,
						},
					},
					deferred,
				));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await vi.waitFor(() => {
					expect(populator.getProgress()).toEqual(expect.objectContaining({
						currentStatus:           "running",
						processedMedias:         19396,
						totalMedias:             19396,
						totalMediasIsLowerBound: true,
					}));
				});

				deferred.resolve();
				await waitForStatus(
					populator,
					"completed",
				);
			},
		);

		it(
			"uses the persisted local media count as the resumed lower-bound total when it is higher",
			async () => {
				loadCheckpointMock.mockReturnValue({
					version:              2,
					lastCompletedPage:    4,
					lastPersistedMediaId: 222,
					updatedAt:            1,
				} satisfies AnimeDbScanCheckpointFixture);
				getAnimeDbUpdateBaselineMock.mockReturnValue({
					mediaCount:           19493,
					maxProviderUpdatedAt: null,
				});
				scanAllMediasMock.mockImplementation(scanBatches());

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				expect(populator.getProgress()).toEqual(expect.objectContaining({
					processedMedias:         19493,
					totalMedias:             19493,
					totalMediasIsLowerBound: true,
				}));
			},
		);

		it(
			"does not use the AniList ID window as the saved-title denominator",
			async () => {
				getAnimeDbUpdateBaselineMock.mockReturnValue({
					mediaCount:           9010,
					maxProviderUpdatedAt: null,
				});
				const deferred = createDeferred();
				scanAllMediasMock.mockImplementation(scanBatchesThenWait(
					{
						...scanBatchFixture(
							429,
							[ 21451 ],
							false,
						),
						pageInfo:   {
							total:       19395,
							perPage:     50,
							currentPage: 1,
							lastPage:    1,
							hasNextPage: false,
						},
						batchMaxId: 21451,
					},
					deferred,
				));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await vi.waitFor(() => {
					expect(populator.getProgress()).toEqual(expect.objectContaining({
						currentStatus:   "running",
						totalMedias:     19395,
						lastProcessedId: 21451,
					}));
				});

				deferred.resolve();
				await waitForStatus(
					populator,
					"completed",
				);
			},
		);

		it(
			"counts only media that were actually saved in the local database",
			async () => {
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					1,
					[
						101,
						102,
					],
					false,
				)));
				upsertMediaMock
					.mockReturnValueOnce(undefined)
					.mockReturnValueOnce(102);

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await waitForStatus(
					populator,
					"completed",
				);

				expect(populator.getProgress().processedMedias).toBe(1);
			},
		);

		it(
			"does not advance the ID cursor when paused inside a batch",
			async () => {
				let populator: PopulatorInstance | null = null;
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					1,
					[
						101,
						102,
					],
					true,
				)));
				upsertMediaMock.mockImplementation((media: AniListMedia) => {
					if (media.id === 101) {
						void populator?.stop();
					}
				});

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				populator = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start(1);
				await waitForStatus(
					populator,
					"paused",
				);

				expect(upsertMediaMock).toHaveBeenCalledTimes(1);
				expect(saveCheckpointMock).toHaveBeenLastCalledWith(expect.objectContaining({
					lastCompletedPage: 0,
					lastPersistedMediaId: 0,
				}));
			},
		);

		it(
			"does not double-count replayed media when resuming a partially persisted page",
			async () => {
				loadCheckpointMock.mockReturnValue({
					version:              2,
					lastCompletedPage:    0,
					lastPersistedMediaId: 101,
					updatedAt:            1,
				} satisfies AnimeDbScanCheckpointFixture);
				getAnimeDbUpdateBaselineMock.mockReturnValue({
					mediaCount:           1,
					maxProviderUpdatedAt: null,
				});
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					1,
					[
						101,
						102,
					],
					false,
				)));

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await waitForStatus(
					populator,
					"completed",
				);

				expect(populator.getProgress().processedMedias).toBe(2);
			},
		);

		it(
			"automatically retries transient scan failures from the last completed page",
			async () => {
				vi.useFakeTimers();
				try {
					scanAllMediasMock
						.mockImplementationOnce(failedScan(new Error("network down")))
						.mockImplementationOnce(scanBatches(scanBatchFixture(
							1,
							[ 101 ],
							false,
						)));

					const { AnimeDbPopulator } = await import("./populate-anime-db");
					const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

					await populator.start();
					await vi.waitFor(() => {
						expect(populator.getProgress()).toEqual(expect.objectContaining({
							currentStatus:        "retrying",
							autoRetryAttempt:     1,
							autoRetryMaxAttempts: 6,
							currentPage:          1,
						}));
					});

					await vi.advanceTimersByTimeAsync(5000);
					await waitForStatus(
						populator,
						"completed",
					);

					expect(scanAllMediasMock).toHaveBeenCalledTimes(2);
					expect(scanAllMediasMock).toHaveBeenLastCalledWith(
						0,
						true,
						50,
					);
					expect(populator.getProgress().processedMedias).toBe(1);
				} finally {
					vi.useRealTimers();
				}
			},
		);

		it(
			"does not auto-retry after the user pauses during the retry delay",
			async () => {
				vi.useFakeTimers();
				try {
					scanAllMediasMock.mockImplementation(failedScan(new Error("network down")));

					const { AnimeDbPopulator } = await import("./populate-anime-db");
					const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

					await populator.start();
					await waitForStatus(
						populator,
						"retrying",
					);

					await populator.stop();

					expect(populator.getProgress().currentStatus).toBe("paused");
					await vi.advanceTimersByTimeAsync(5000);
					expect(scanAllMediasMock).toHaveBeenCalledTimes(1);
				} finally {
					vi.useRealTimers();
				}
			},
		);

		it(
			"replays from the last committed media ID after a mid-batch failure and process restart",
			async () => {
				loadCheckpointMock.mockReturnValue({
					version:           2,
					lastCompletedPage: 2,
					lastPersistedMediaId: 250,
					updatedAt:         1,
				} satisfies AnimeDbScanCheckpointFixture);
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					3,
					[
						301,
						302,
					],
					true,
				)));
				upsertMediaMock.mockImplementation((media: AniListMedia) => {
					if (media.id === 302) {
						throw new Error("write failed");
					}
				});

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const failingPopulator     = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await failingPopulator.start();
				await waitForStatus(
					failingPopulator,
					"error",
				);

				const savedCheckpoint = saveCheckpointMock.mock.calls.at(-1)?.[ 0 ] as AnimeDbScanCheckpointFixture;
				expect(savedCheckpoint).toEqual(expect.objectContaining({
					lastCompletedPage: 2,
					lastPersistedMediaId: 250,
				}));

				vi.resetModules();
				vi.clearAllMocks();
				isDevModeEnabledMock.mockReturnValue(true);
				loadCheckpointMock.mockReturnValue(savedCheckpoint);
				upsertMediaMock.mockReturnValue(undefined);
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					3,
					[
						301,
						302,
					],
					false,
				)));

				const { AnimeDbPopulator: FreshAnimeDbPopulator } = await import("./populate-anime-db");
				const restartedPopulator                          = FreshAnimeDbPopulator.getInstance() as PopulatorInstance;

				await restartedPopulator.start();
				await waitForStatus(
					restartedPopulator,
					"completed",
				);

				expect(scanAllMediasMock).toHaveBeenCalledWith(
					250,
					true,
					50,
				);
				expect(upsertMediaMock).toHaveBeenCalledTimes(2);
			},
		);

		it(
			"normalizes non-Error media write failures before terminal logging",
			async () => {
				scanAllMediasMock.mockImplementation(scanBatches(scanBatchFixture(
					1,
					[ 101 ],
					false,
				)));
				upsertMediaMock.mockImplementation(() => {
					throw "write failed";
				});

				const { AnimeDbPopulator } = await import("./populate-anime-db");
				const populator            = AnimeDbPopulator.getInstance() as PopulatorInstance;

				await populator.start();
				await waitForStatus(
					populator,
					"error",
				);

				expect(logMainServiceErrorMock).toHaveBeenCalledTimes(1);
				expect(logMainServiceErrorMock).toHaveBeenCalledWith(
					"anime-db.populate.start",
					expect.objectContaining({
						message: "write failed",
					}),
					{ mediaIdAniList: 101 },
				);
				expect(populator.getProgress()).toEqual(expect.objectContaining({
					currentStatus: "error",
					errorMessage:  "write failed",
				}));
			},
		);
	},
);
