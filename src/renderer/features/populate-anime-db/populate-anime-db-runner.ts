import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import {
	AnimeDbPopulationFacade,
	UserConfigFacade,
} from "../../facades";

// Population is an admin/dev workflow. Hooks own button state and error display;
// this runner owns the progress stream and write commands crossing IPC.
export function populationProgressChanges(): Observable<PopulateAnimeDbProgressData> {
	return AnimeDbPopulationFacade.progressChanges();
}

export function loadPopulationStatus(): Promise<PopulateAnimeDbProgressData> {
	return AnimeDbPopulationFacade.getStatus();
}

export function loadPopulationDevModeStatus(): Promise<boolean> {
	return UserConfigFacade.getDevModeStatus();
}

export function startAnimeDbPopulation() {
	return AnimeDbPopulationFacade.start();
}

export function stopAnimeDbPopulation() {
	return AnimeDbPopulationFacade.stop();
}

export function restartAnimeDbPopulation() {
	return AnimeDbPopulationFacade.restart();
}
