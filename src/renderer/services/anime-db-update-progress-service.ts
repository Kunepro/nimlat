import type { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class AnimeDbUpdateProgressServiceImpl {
	private readonly progress$ = createSharedPreloadEventStream<AnimeDbUpdateProgressData>(
		(listener) => window.electronAPI.animeDbUpdate.onAnimeDbUpdateProgress(listener),
	);

	public progressChanges(): Observable<AnimeDbUpdateProgressData> {
		return this.progress$;
	}
}

export const AnimeDbUpdateProgressService = new AnimeDbUpdateProgressServiceImpl();
