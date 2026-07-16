import { typeSafeError } from "@nimlat/functions";
import type { AniListMedia } from "@nimlat/types/ani-list-media-api";
import { Observable } from "rxjs";
import { ingestAnimeDbMedia } from "./anime-db-media-ingestion";
import { NonRetriableAnimeDbPopulateError } from "./anime-db-populate-errors";

interface AnimeDbPopulateBatchMediaPersistedEvent {
	kind: "mediaPersisted";
	media: AniListMedia;
	persistedMediaId?: number;
	wasAlreadyCounted: boolean;
	highestProcessedInBatch: number;
}

interface AnimeDbPopulateBatchStoppedEvent {
	kind: "stopped";
}

export type AnimeDbPopulateBatchEvent =
	| AnimeDbPopulateBatchMediaPersistedEvent
	| AnimeDbPopulateBatchStoppedEvent;

interface ProcessAnimeDbPopulateBatchInput {
	medias: AniListMedia[];
	committedLastMediaId: number;
	signal?: AbortSignal;
}

// Scanner batches already contain complete AniList media payloads and are written
// directly through the canonical ingestion boundary. The batch is replay-safe:
// its persisted cursor advances only after the caller confirms every media write,
// while renderer progress may still advance item by item.
export function streamAnimeDbPopulateBatch(input: ProcessAnimeDbPopulateBatchInput): Observable<AnimeDbPopulateBatchEvent> {
	return new Observable((subscriber) => {
		let highestProcessedInBatch = input.committedLastMediaId;

		for (const media of input.medias) {
			if (input.signal?.aborted) {
				subscriber.next({ kind: "stopped" });
				subscriber.complete();
				return;
			}

			try {
				const wasAlreadyCounted = media.id <= input.committedLastMediaId;
				const persistedMediaId  = ingestAnimeDbMedia(
					media,
					{ source: "anime-db-populator" },
				);
				highestProcessedInBatch = Math.max(
					highestProcessedInBatch,
					media.id,
				);
				subscriber.next({
					kind: "mediaPersisted",
					media,
					persistedMediaId,
					wasAlreadyCounted,
					highestProcessedInBatch,
				});
			} catch (error) {
				const safeError = typeSafeError(error);
				// The populator coordinator logs the terminal failure with checkpoint
				// context; logging here as well would report the same failed write twice.
				subscriber.error(new NonRetriableAnimeDbPopulateError(
					"Failed to persist a scanned AniList title.",
					safeError,
					{ mediaIdAniList: media.id },
				));
				return;
			}
		}

		subscriber.complete();
	});
}
