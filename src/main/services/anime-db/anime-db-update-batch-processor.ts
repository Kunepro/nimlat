import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { Observable } from "rxjs";
import { ingestAnimeDbMedia } from "./anime-db-media-ingestion";

interface AnimeDbUpdateBatchMediaIngestedEvent {
	kind: "mediaIngested";
	media: AniListMedia;
	providerUpdatedAt: number;
	maxProviderUpdatedAt: number;
}

interface AnimeDbUpdateBatchStoppedEvent {
	kind: "stopped";
	maxProviderUpdatedAt: number;
}

export type AnimeDbUpdateBatchEvent =
	| AnimeDbUpdateBatchMediaIngestedEvent
	| AnimeDbUpdateBatchStoppedEvent;

interface IngestAnimeDbUpdateBatchInput {
	medias: AniListMedia[];
	currentMaxProviderUpdatedAt: number;
	signal?: AbortSignal;
}

// Batch ingest is replay-safe: callers own cursor advancement and only commit
// a successful sweep after every media in the current batch has been written.
export function streamAnimeDbUpdateBatch(input: IngestAnimeDbUpdateBatchInput): Observable<AnimeDbUpdateBatchEvent> {
	return new Observable((subscriber) => {
		let maxProviderUpdatedAt = input.currentMaxProviderUpdatedAt;

		for (const media of input.medias) {
			if (input.signal?.aborted) {
				subscriber.next({
					kind: "stopped",
					maxProviderUpdatedAt,
				});
				subscriber.complete();
				return;
			}

			ingestAnimeDbMedia(
				media,
				{ source: "anime-db-updater" },
			);

			const providerUpdatedAt = media.updatedAt ?? 0;
			maxProviderUpdatedAt    = Math.max(
				maxProviderUpdatedAt,
				providerUpdatedAt,
			);
			subscriber.next({
				kind: "mediaIngested",
				media,
				providerUpdatedAt,
				maxProviderUpdatedAt,
			});
		}

		subscriber.complete();
	});
}
