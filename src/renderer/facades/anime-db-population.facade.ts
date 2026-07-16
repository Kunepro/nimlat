import type { ElectronAPI } from "@nimlat/types/electron-api";
import { AnimeDbPopulationProgressService } from "../services/anime-db-population-progress-service";

type AnimeDbPopulationApi = ElectronAPI["animeDbPopulation"];
type AnimeDbPopulationProgressApi = typeof AnimeDbPopulationProgressService;

export class AnimeDbPopulationFacade {
	public static start(...args: Parameters<AnimeDbPopulationApi["start"]>): ReturnType<AnimeDbPopulationApi["start"]> {
		return window.electronAPI.animeDbPopulation.start(...args);
	}

	public static getStatus(...args: Parameters<AnimeDbPopulationApi["getStatus"]>): ReturnType<AnimeDbPopulationApi["getStatus"]> {
		return window.electronAPI.animeDbPopulation.getStatus(...args);
	}

	public static stop(...args: Parameters<AnimeDbPopulationApi["stop"]>): ReturnType<AnimeDbPopulationApi["stop"]> {
		return window.electronAPI.animeDbPopulation.stop(...args);
	}

	public static restart(...args: Parameters<AnimeDbPopulationApi["restart"]>): ReturnType<AnimeDbPopulationApi["restart"]> {
		return window.electronAPI.animeDbPopulation.restart(...args);
	}

	public static progressChanges(...args: Parameters<AnimeDbPopulationProgressApi["progressChanges"]>): ReturnType<AnimeDbPopulationProgressApi["progressChanges"]> {
		return AnimeDbPopulationProgressService.progressChanges(...args);
	}
}
