import type { PopulateAnimeDbProgressData } from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class AnimeDbPopulationProgressServiceImpl {
	private readonly progress$ = createSharedPreloadEventStream<PopulateAnimeDbProgressData>(
		(listener) => window.electronAPI.animeDbPopulation.onPopulateAnimeDbProgress(listener),
	);

	public progressChanges(): Observable<PopulateAnimeDbProgressData> {
		return this.progress$;
	}
}

export const AnimeDbPopulationProgressService = new AnimeDbPopulationProgressServiceImpl();
