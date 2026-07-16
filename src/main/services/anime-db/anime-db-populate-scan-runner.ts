import { Observable } from "rxjs";
import type { AniListMediasScanBatch } from "./ani-list-media-scanner";
import { scanAllMedias } from "./ani-list-media-scanner";

export interface AnimeDbPopulateScanBatchEvent {
	kind: "batchScanned";
	currentPage: number;
	requestCount: number;
	totalMedias: number | null;
	batchMaxId: number;
	batch: AniListMediasScanBatch;
}

interface AnimeDbPopulateScanStoppedEvent {
	kind: "stopped";
}

export type AnimeDbPopulateScanEvent =
	| AnimeDbPopulateScanBatchEvent
	| AnimeDbPopulateScanStoppedEvent;

export interface StreamAnimeDbPopulateScanInput {
	startAfterMediaId: number;
	includeAdult: boolean;
	perPage: number;
	signal?: AbortSignal;
}

// Runs the ID-window full scan as an event source. Checkpoint mutation stays in
// the populator so the replay-safe commit rule cannot be hidden in scanner code.
export function streamAnimeDbPopulateScan(input: StreamAnimeDbPopulateScanInput): Observable<AnimeDbPopulateScanEvent> {
	return new Observable((subscriber) => {
		void (async () => {
			if (input.signal?.aborted) {
				subscriber.next({ kind: "stopped" });
				subscriber.complete();
				return;
			}

			const scanner = scanAllMedias(
				input.startAfterMediaId,
				input.includeAdult,
				input.perPage,
			);

			for await (const batch of scanner) {
				if (input.signal?.aborted || subscriber.closed) {
					if (!subscriber.closed) {
						subscriber.next({ kind: "stopped" });
						subscriber.complete();
					}
					return;
				}

				subscriber.next({
					kind:         "batchScanned",
					currentPage:  batch.currentPage,
					requestCount: batch.requestCount,
					totalMedias:  batch.pageInfo.total ?? null,
					batchMaxId:   batch.batchMaxId,
					batch,
				});
			}

			if (input.signal?.aborted) {
				subscriber.next({ kind: "stopped" });
			}

			subscriber.complete();
		})().catch((error: unknown) => {
			if (!subscriber.closed) {
				subscriber.error(error);
			}
		});
	});
}
