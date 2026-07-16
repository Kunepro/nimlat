import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import { Subject } from "rxjs";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	AnimeDbPopulationFacade,
	UserConfigFacade,
} from "../../facades";
import {
	loadPopulationDevModeStatus,
	loadPopulationStatus,
	populationProgressChanges,
	restartAnimeDbPopulation,
	startAnimeDbPopulation,
	stopAnimeDbPopulation,
} from "./populate-anime-db-runner";

const progress: PopulateAnimeDbProgressData = {
	currentPage:             1,
	requestBatch:            0,
	totalPages:              null,
	processedMedias:         0,
	totalMedias:             null,
	totalMediasIsLowerBound: false,
	currentStatus:           "idle",
};

describe(
	"populate-anime-db-runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads population status and dev-mode gates through facades",
			async () => {
				vi.spyOn(
					AnimeDbPopulationFacade,
					"getStatus",
				).mockResolvedValue(progress);
				vi.spyOn(
					UserConfigFacade,
					"getDevModeStatus",
				).mockResolvedValue(true);

				await expect(loadPopulationStatus()).resolves.toBe(progress);
				await expect(loadPopulationDevModeStatus()).resolves.toBe(true);

				expect(AnimeDbPopulationFacade.getStatus).toHaveBeenCalledTimes(1);
				expect(UserConfigFacade.getDevModeStatus).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"exposes population progress changes from the population facade",
			() => {
				const progress$ = new Subject<PopulateAnimeDbProgressData>();
				const listener  = vi.fn();
				vi.spyOn(
					AnimeDbPopulationFacade,
					"progressChanges",
				).mockReturnValue(progress$);

				const subscription = populationProgressChanges().subscribe(listener);
				progress$.next(progress);

				expect(listener).toHaveBeenCalledWith(progress);
				expect(AnimeDbPopulationFacade.progressChanges).toHaveBeenCalledTimes(1);

				subscription.unsubscribe();
			},
		);

		it(
			"runs population write commands through the population facade",
			async () => {
				vi.spyOn(
					AnimeDbPopulationFacade,
					"start",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					AnimeDbPopulationFacade,
					"stop",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					AnimeDbPopulationFacade,
					"restart",
				).mockResolvedValue({ success: true });

				await expect(startAnimeDbPopulation()).resolves.toEqual({ success: true });
				await expect(stopAnimeDbPopulation()).resolves.toEqual({ success: true });
				await expect(restartAnimeDbPopulation()).resolves.toEqual({ success: true });

				expect(AnimeDbPopulationFacade.start).toHaveBeenCalledTimes(1);
				expect(AnimeDbPopulationFacade.stop).toHaveBeenCalledTimes(1);
				expect(AnimeDbPopulationFacade.restart).toHaveBeenCalledTimes(1);
			},
		);
	},
);
