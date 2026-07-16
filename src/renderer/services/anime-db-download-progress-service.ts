import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import { createSharedPreloadEventStream } from "./preload-event-stream";

class AnimeDbDownloadProgressServiceImpl {
	private readonly progress$ = createSharedPreloadEventStream<AnimeDbDownloadProgressData>(
		(listener) => window.electronAPI.animeDbDownload.onAnimeDbDownloadProgress(listener),
	);

	public progressChanges(): Observable<AnimeDbDownloadProgressData> {
		return this.progress$;
	}
}

export const AnimeDbDownloadProgressService = new AnimeDbDownloadProgressServiceImpl();
