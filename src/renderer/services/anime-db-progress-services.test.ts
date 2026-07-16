// @vitest-environment node
import type {
	AnimeDbDownloadProgressData,
	AnimeDbUpdateProgressData,
	PopulateAnimeDbProgressData,
} from "@nimlat/types/ipc-payloads";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

function installAnimeDbProgressApis() {
	let downloadListener: ((event: AnimeDbDownloadProgressData) => void) | null   = null;
	let populationListener: ((event: PopulateAnimeDbProgressData) => void) | null = null;
	let updateListener: ((event: AnimeDbUpdateProgressData) => void) | null       = null;
	const unsubscribeDownload                                                     = vi.fn();
	const unsubscribePopulation                                                   = vi.fn();
	const unsubscribeUpdate                                                       = vi.fn();
	const animeDbDownload                                                         = {
		onAnimeDbDownloadProgress: vi.fn((listener: (event: AnimeDbDownloadProgressData) => void) => {
			downloadListener = listener;
			return unsubscribeDownload;
		}),
	};
	const animeDbPopulation                                                       = {
		onPopulateAnimeDbProgress: vi.fn((listener: (event: PopulateAnimeDbProgressData) => void) => {
			populationListener = listener;
			return unsubscribePopulation;
		}),
	};
	const animeDbUpdate                                                           = {
		onAnimeDbUpdateProgress: vi.fn((listener: (event: AnimeDbUpdateProgressData) => void) => {
			updateListener = listener;
			return unsubscribeUpdate;
		}),
	};

	vi.stubGlobal(
		"window",
		{
			electronAPI: {
				animeDbDownload,
				animeDbPopulation,
				animeDbUpdate,
			},
		},
	);

	return {
		animeDbDownload,
		animeDbPopulation,
		animeDbUpdate,
		unsubscribeDownload,
		unsubscribePopulation,
		unsubscribeUpdate,
		emitDownloadProgress:   (event: AnimeDbDownloadProgressData) => {
			downloadListener?.(event);
		},
		emitPopulationProgress: (event: PopulateAnimeDbProgressData) => {
			populationListener?.(event);
		},
		emitUpdateProgress:     (event: AnimeDbUpdateProgressData) => {
			updateListener?.(event);
		},
	};
}

const downloadProgress: AnimeDbDownloadProgressData = {
	status:              "downloading",
	receivedBytes:       128,
	totalBytes:          256,
	percent:             50,
	speedBytesPerSecond: 64,
	etaSeconds:          2,
};

const populationProgress: PopulateAnimeDbProgressData = {
	currentPage:             2,
	requestBatch:            1,
	totalPages:              null,
	processedMedias:         20,
	totalMedias:             null,
	totalMediasIsLowerBound: false,
	currentStatus:           "running",
};

const updateProgress: AnimeDbUpdateProgressData = {
	status:                          "running",
	phase:                           "updated-at-sweep",
	currentPage:                     3,
	processedMedias:                 30,
	totalMedias:                     60,
	cutoffProviderUpdatedAt:         100,
	lastSuccessfulProviderUpdatedAt: 50,
};

describe(
	"AnimeDB progress services",
	() => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it(
			"exposes shared download progress events",
			async () => {
				const {
								animeDbDownload,
								emitDownloadProgress,
								unsubscribeDownload,
							}                                  = installAnimeDbProgressApis();
				const { AnimeDbDownloadProgressService } = await import("./anime-db-download-progress-service");
				const firstListener                      = vi.fn();
				const secondListener                     = vi.fn();

				const firstSubscription  = AnimeDbDownloadProgressService.progressChanges().subscribe(firstListener);
				const secondSubscription = AnimeDbDownloadProgressService.progressChanges().subscribe(secondListener);

				expect(animeDbDownload.onAnimeDbDownloadProgress).toHaveBeenCalledTimes(1);
				emitDownloadProgress(downloadProgress);
				expect(firstListener).toHaveBeenCalledWith(downloadProgress);
				expect(secondListener).toHaveBeenCalledWith(downloadProgress);

				firstSubscription.unsubscribe();
				secondSubscription.unsubscribe();
				expect(unsubscribeDownload).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes shared update progress events",
			async () => {
				const {
								animeDbUpdate,
								emitUpdateProgress,
								unsubscribeUpdate,
							}                                = installAnimeDbProgressApis();
				const { AnimeDbUpdateProgressService } = await import("./anime-db-update-progress-service");
				const listener                         = vi.fn();

				const subscription = AnimeDbUpdateProgressService.progressChanges().subscribe(listener);

				expect(animeDbUpdate.onAnimeDbUpdateProgress).toHaveBeenCalledTimes(1);
				emitUpdateProgress(updateProgress);
				expect(listener).toHaveBeenCalledWith(updateProgress);

				subscription.unsubscribe();
				expect(unsubscribeUpdate).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes shared population progress events",
			async () => {
				const {
								animeDbPopulation,
								emitPopulationProgress,
								unsubscribePopulation,
							}                                    = installAnimeDbProgressApis();
				const { AnimeDbPopulationProgressService } = await import("./anime-db-population-progress-service");
				const listener                             = vi.fn();

				const subscription = AnimeDbPopulationProgressService.progressChanges().subscribe(listener);

				expect(animeDbPopulation.onPopulateAnimeDbProgress).toHaveBeenCalledTimes(1);
				emitPopulationProgress(populationProgress);
				expect(listener).toHaveBeenCalledWith(populationProgress);

				subscription.unsubscribe();
				expect(unsubscribePopulation).toHaveBeenCalledTimes(1);
			},
		);

	},
);
