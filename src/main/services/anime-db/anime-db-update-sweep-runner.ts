import type { PageInfo } from "@nimlat/types/ani-list-media-api";
import {
	Observable,
	type Subscriber,
} from "rxjs";
import {
	type AnimeDbUpdateCursor,
	getOldestProviderUpdatedAt,
	ID_TAIL_OVERLAP_PAGES,
	resolveUpdatedAtSweepCutoff,
} from "./anime-db-update-policy";
import { queryAnimeDbUpdateProviderPage } from "./anime-db-update-provider-page";

type AnimeDbUpdateSweepPhase = "updatedAt" | "tail";

interface AnimeDbUpdateSweepStartedEvent {
	kind: "sweepStarted";
	phase: AnimeDbUpdateSweepPhase;
	page: number;
	cutoffProviderUpdatedAt?: number;
}

interface AnimeDbUpdateSweepPageScannedEvent {
	kind: "pageScanned";
	phase: AnimeDbUpdateSweepPhase;
	page: number;
	pageInfo: PageInfo;
	medias: Awaited<ReturnType<typeof queryAnimeDbUpdateProviderPage>>["medias"];
}

interface AnimeDbUpdateSweepCompletedEvent {
	kind: "completed";
	phase: AnimeDbUpdateSweepPhase;
	lastTailPage?: number;
}

interface AnimeDbUpdateSweepStoppedEvent {
	kind: "stopped";
	phase: AnimeDbUpdateSweepPhase;
	lastTailPage?: number;
}

export type AnimeDbUpdateSweepEvent =
	| AnimeDbUpdateSweepStartedEvent
	| AnimeDbUpdateSweepPageScannedEvent
	| AnimeDbUpdateSweepCompletedEvent
	| AnimeDbUpdateSweepStoppedEvent;

interface StreamAnimeDbUpdateSweepInput {
	signal?: AbortSignal;
}

function emitStoppedIfNeeded(
	subscriber: Subscriber<AnimeDbUpdateSweepEvent>,
	phase: AnimeDbUpdateSweepPhase,
	lastTailPage?: number,
): boolean {
	if (!subscriber.closed) {
		subscriber.next({
			kind: "stopped",
			phase,
			lastTailPage,
		});
		subscriber.complete();
	}
	return true;
}

// Replays recently updated pages until the overlap boundary has been fully processed.
// The boundary page is intentionally ingested before stopping so equal/near-cutoff
// records are not skipped when provider ordering shifts.
export function streamAnimeDbUpdatedAtSweep(
	cursor: AnimeDbUpdateCursor,
	input: StreamAnimeDbUpdateSweepInput = {},
): Observable<AnimeDbUpdateSweepEvent> {
	return new Observable((subscriber) => {
		void (async () => {
			const cutoffProviderUpdatedAt = resolveUpdatedAtSweepCutoff(cursor);
			let page                      = 1;

			if (input.signal?.aborted) {
				emitStoppedIfNeeded(
					subscriber,
					"updatedAt",
				);
				return;
			}

			subscriber.next({
				kind:  "sweepStarted",
				phase: "updatedAt",
				page,
				cutoffProviderUpdatedAt,
			});

			while (true) {
				if (input.signal?.aborted) {
					emitStoppedIfNeeded(
						subscriber,
						"updatedAt",
					);
					return;
				}

				const {
								pageInfo,
								medias,
							} = await queryAnimeDbUpdateProviderPage(
					page,
					[ "UPDATED_AT_DESC" ],
				);
				if (input.signal?.aborted) {
					emitStoppedIfNeeded(
						subscriber,
						"updatedAt",
					);
					return;
				}

				if (medias.length === 0) {
					subscriber.next({
						kind:  "completed",
						phase: "updatedAt",
					});
					subscriber.complete();
					return;
				}

				subscriber.next({
					kind:  "pageScanned",
					phase: "updatedAt",
					page,
					pageInfo,
					medias,
				});

				if (getOldestProviderUpdatedAt(medias) < cutoffProviderUpdatedAt) {
					subscriber.next({
						kind:  "completed",
						phase: "updatedAt",
					});
					subscriber.complete();
					return;
				}

				if (!pageInfo.hasNextPage) {
					subscriber.next({
						kind:  "completed",
						phase: "updatedAt",
					});
					subscriber.complete();
					return;
				}

				page++;
			}
		})().catch((error: unknown) => {
			if (!subscriber.closed) {
				subscriber.error(error);
			}
		});
	});
}

// Sweeps the ID-ordered tail with overlap because new media can appear after the
// last known catalog page. Cursor advancement still happens only after this pass.
export function streamAnimeDbTailSweep(
	cursor: AnimeDbUpdateCursor,
	input: StreamAnimeDbUpdateSweepInput = {},
): Observable<AnimeDbUpdateSweepEvent> {
	return new Observable((subscriber) => {
		void (async () => {
			let page         = Math.max(
				1,
				cursor.lastKnownTailPage - ID_TAIL_OVERLAP_PAGES,
			);
			let lastTailPage = cursor.lastKnownTailPage;

			if (input.signal?.aborted) {
				emitStoppedIfNeeded(
					subscriber,
					"tail",
					lastTailPage,
				);
				return;
			}

			subscriber.next({
				kind:  "sweepStarted",
				phase: "tail",
				page,
			});

			while (true) {
				if (input.signal?.aborted) {
					emitStoppedIfNeeded(
						subscriber,
						"tail",
						lastTailPage,
					);
					return;
				}

				const {
								pageInfo,
								medias,
							} = await queryAnimeDbUpdateProviderPage(
					page,
					[ "ID" ],
				);
				if (input.signal?.aborted) {
					emitStoppedIfNeeded(
						subscriber,
						"tail",
						lastTailPage,
					);
					return;
				}

				if (medias.length === 0) {
					subscriber.next({
						kind:         "completed",
						phase:        "tail",
						lastTailPage: Math.max(
							1,
							pageInfo.lastPage,
							page - 1,
						),
					});
					subscriber.complete();
					return;
				}

				subscriber.next({
					kind:  "pageScanned",
					phase: "tail",
					page,
					pageInfo,
					medias,
				});
				lastTailPage = page;

				if (!pageInfo.hasNextPage) {
					subscriber.next({
						kind:  "completed",
						phase: "tail",
						lastTailPage,
					});
					subscriber.complete();
					return;
				}

				page++;
			}
		})().catch((error: unknown) => {
			if (!subscriber.closed) {
				subscriber.error(error);
			}
		});
	});
}
