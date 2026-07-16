import { BUS_AnimeDbUpdateProgress } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import { LoggerUtils } from "@nimlat/loggers/main";
import type { AnimeDbUpdateState } from "@nimlat/types/anime-db-update";
import type { AnimeDbUpdateProgressData } from "@nimlat/types/ipc-payloads";
import {
	concatMap,
	defaultIfEmpty,
	EMPTY,
	endWith,
	lastValueFrom,
	of,
	tap,
} from "rxjs";
import { streamAnimeDbUpdateBatch } from "./anime-db-update-batch-processor";
import { normalizeAnimeDbUpdateRuntimeError } from "./anime-db-update-error-policy";
import {
	type AnimeDbUpdateCursor,
	resolveAnimeDbUpdateStartCursor,
	resolveCooldownEndsAt,
	type SweepResult,
	toStoredProviderUpdatedAt,
} from "./anime-db-update-policy";
import { AnimeDbUpdateRunState } from "./anime-db-update-run-state";
import {
	createAnimeDbUpdateRunState,
	createCompletedAnimeDbUpdateState,
	loadAnimeDbUpdateStateSafely,
	saveAnimeDbUpdateStateSafely,
} from "./anime-db-update-state-store";
import {
	applyAnimeDbUpdateBatchEvent,
	applyAnimeDbUpdateSweepCompletedEvent,
	applyAnimeDbUpdateSweepStoppedEvent,
	createAnimeDbUpdateSweepResult,
} from "./anime-db-update-sweep-result";
import {
	type AnimeDbUpdateSweepEvent,
	streamAnimeDbTailSweep,
	streamAnimeDbUpdatedAtSweep,
} from "./anime-db-update-sweep-runner";

// User-safe incremental AnimeDB updater. Durable page numbers are unsafe because
// UPDATED_AT_DESC pages shift and newly created IDs may land beyond the previous
// tail. Each run therefore replays an updatedAt overlap from page 1, performs an
// overlapping ID-tail sweep, and advances the stored cursor only after both
// complete-media ingestion phases finish successfully.
export class AnimeDbUpdater {
	private static instance: AnimeDbUpdater | null = null;

	private isRunning                                  = false;
	private shouldStop                                 = false;
	private runPromise: Promise<void> | null           = null;
	private activeCursor: AnimeDbUpdateCursor | null   = null;
	private runAbortController: AbortController | null = null;
	private readonly runState                          = new AnimeDbUpdateRunState();

	private constructor() {
		this.loadIdleProgressFromState();
	}

	public static getInstance(): AnimeDbUpdater {
		if (!AnimeDbUpdater.instance) {
			AnimeDbUpdater.instance = new AnimeDbUpdater();
		}
		return AnimeDbUpdater.instance;
	}

	public getProgress(): AnimeDbUpdateProgressData {
		return this.runState.getProgress();
	}

	public async start(): Promise<void> {
		if (this.isRunning) {
			throw new Error("AnimeDB update is already running");
		}

		if (this.shortCircuitRecentCompletedRun()) {
			this.broadcastProgress();
			return;
		}

		const cursor    = this.resolveStartCursor();
		this.isRunning  = true;
		this.shouldStop = false;
		this.activeCursor = cursor;
		this.runAbortController = new AbortController();
		this.runState.markRunning(
			cursor,
			Date.now(),
		);
		this.saveRunState("running");
		this.broadcastProgress();
		this.launchUpdateRun(cursor);
	}

	// Stop is cooperative: the updater pauses between provider writes and keeps the previous successful cursor.
	public stop(): Promise<void> {
		if (!this.isRunning) {
			return Promise.resolve();
		}

		this.shouldStop = true;
		this.runAbortController?.abort();
		return this.runPromise ?? Promise.resolve();
	}

	private async updateDatabase(cursor: AnimeDbUpdateCursor): Promise<void> {
		const updatedAtResult = await this.consumeUpdatedAtSweepEvents(cursor);
		if (updatedAtResult.stopped) {
			this.pauseCurrentRun();
			return;
		}

		const tailResult = await this.consumeTailSweepEvents(
			cursor,
			updatedAtResult.maxProviderUpdatedAt,
		);
		if (tailResult.stopped) {
			this.pauseCurrentRun();
			return;
		}

		const completedAt       = Date.now();
		const completedHighWatermark = toStoredProviderUpdatedAt(tailResult.maxProviderUpdatedAt);
		const completedTailPage = tailResult.lastTailPage ?? cursor.lastKnownTailPage;
		this.saveCompletedState(
			completedHighWatermark,
			completedTailPage,
			completedAt,
		);
		this.runState.markCompleted({
			completedAt,
			lastSuccessfulProviderUpdatedAt: completedHighWatermark,
		});
		this.broadcastProgress();
	}

	private async consumeUpdatedAtSweepEvents(cursor: AnimeDbUpdateCursor): Promise<SweepResult> {
		return this.consumeSweepEvents(
			streamAnimeDbUpdatedAtSweep(
				cursor,
				{ signal: this.runAbortController?.signal },
			),
			cursor.lastSuccessfulProviderUpdatedAt,
		);
	}

	private async consumeTailSweepEvents(
		cursor: AnimeDbUpdateCursor,
		currentMaxProviderUpdatedAt: number,
	): Promise<SweepResult> {
		return this.consumeSweepEvents(
			streamAnimeDbTailSweep(
				cursor,
				{ signal: this.runAbortController?.signal },
			),
			currentMaxProviderUpdatedAt,
			cursor.lastKnownTailPage,
		);
	}

	private async consumeSweepEvents(
		source$: ReturnType<typeof streamAnimeDbUpdatedAtSweep>,
		initialMaxProviderUpdatedAt: number,
		initialLastTailPage?: number,
	): Promise<SweepResult> {
		let result = createAnimeDbUpdateSweepResult({
			initialMaxProviderUpdatedAt,
			initialLastTailPage,
		});

		await lastValueFrom(source$.pipe(
			concatMap((event) => {
				if (result.stopped) {
					return EMPTY;
				}

				return this.consumeSweepEvent(
					event,
					result,
				).pipe(
					tap((nextResult) => {
						result = nextResult;
					}),
				);
			}),
			defaultIfEmpty(null),
		));

		if (this.shouldStop) {
			return {
				...result,
				stopped: true,
			};
		}

		return result;
	}

	private consumeSweepEvent(event: AnimeDbUpdateSweepEvent, currentResult: SweepResult) {
		if (event.kind === "stopped") {
			return of(applyAnimeDbUpdateSweepStoppedEvent(
				currentResult,
				event,
			));
		}

		if (event.kind === "completed") {
			return of(applyAnimeDbUpdateSweepCompletedEvent(
				currentResult,
				event,
			));
		}

		if (event.kind === "sweepStarted") {
			if (event.phase === "updatedAt") {
				this.runState.markUpdatedAtSweepStarted(
					event.page,
					event.cutoffProviderUpdatedAt ?? 0,
				);
			} else {
				this.runState.markTailSweepStarted(event.page);
			}
			this.broadcastProgress();
			return of(currentResult);
		}

		this.runState.markPageProgress(
			event.page,
			event.pageInfo,
		);
		this.broadcastProgress();

		return this.processUpdateBatchEvents(
			event.medias,
			currentResult,
		);
	}

	private processUpdateBatchEvents(
		medias: Extract<AnimeDbUpdateSweepEvent, { kind: "pageScanned" }>["medias"],
		currentResult: SweepResult,
	) {
		let batchResult: SweepResult = { ...currentResult };

		return streamAnimeDbUpdateBatch({
			medias,
			currentMaxProviderUpdatedAt: currentResult.maxProviderUpdatedAt,
			signal:                      this.runAbortController?.signal,
		}).pipe(
			tap((event) => {
				batchResult = applyAnimeDbUpdateBatchEvent(
					batchResult,
					event,
				);
				if (event.kind === "stopped") {
					return;
				}

				if (this.runState.recordMediaIngested({
					mediaId:           event.media.id,
					providerUpdatedAt: event.providerUpdatedAt,
				})) {
					this.broadcastProgress();
				}
			}),
			endWith("batchCompleted" as const),
			concatMap((event) => event === "batchCompleted" ? [ batchResult ] : EMPTY),
		);
	}

	private resolveStartCursor(): AnimeDbUpdateCursor {
		const baseline = AnimeDbFacade.scanState.getAnimeDbUpdateBaseline();
		if (baseline.mediaCount === 0) {
			throw new Error("AnimeDB baseline is empty; download the official AnimeDB before updating");
		}

		const persistedState = loadAnimeDbUpdateStateSafely();
		return resolveAnimeDbUpdateStartCursor({
			baseline,
			persistedState,
		});
	}

	private pauseCurrentRun(): void {
		this.runState.markPaused();
		this.saveRunState("paused");
		this.broadcastProgress();
	}

	private saveRunState(status: AnimeDbUpdateState["lastRunStatus"], errorMessage: string | null = null): void {
		if (!this.activeCursor) {
			return;
		}

		saveAnimeDbUpdateStateSafely(createAnimeDbUpdateRunState({
			cursor:    this.activeCursor,
			progress:  this.runState.getProgress(),
			status,
			errorMessage,
			updatedAt: Date.now(),
		}));
	}

	private saveCompletedState(
		lastSuccessfulProviderUpdatedAt: number | null,
		lastKnownTailPage: number,
		completedAt: number,
	): void {
		saveAnimeDbUpdateStateSafely(createCompletedAnimeDbUpdateState({
			lastSuccessfulProviderUpdatedAt,
			lastKnownTailPage,
			completedAt,
			startedAt: this.runState.getProgress().startedAt ?? null,
		}));
	}

	private shortCircuitRecentCompletedRun(): boolean {
		const state = loadAnimeDbUpdateStateSafely();
		const cooldownEndsAt = resolveCooldownEndsAt(state);
		if (!state || cooldownEndsAt === null || cooldownEndsAt <= Date.now()) {
			return false;
		}

		// Recent successful updates are treated as already complete; this avoids unnecessary provider traffic.
		this.runState.markRecentCompleted(
			state,
			cooldownEndsAt,
		);
		return true;
	}

	private loadIdleProgressFromState(): void {
		const state = loadAnimeDbUpdateStateSafely();
		if (!state) {
			return;
		}

		this.runState.restoreIdleFromState(state);
	}

	private launchUpdateRun(cursor: AnimeDbUpdateCursor): void {
		this.runPromise = this.updateDatabase(cursor)
			.catch(error => {
				const normalizedError = normalizeAnimeDbUpdateRuntimeError(error);
				LoggerUtils.logMainServiceError(
					"anime-db.update.run",
					normalizedError,
				);
				const errorMessage = normalizedError.message;
				this.runState.markError(errorMessage);
				this.saveRunState(
					"error",
					errorMessage,
				);
				this.broadcastProgress();
			})
			.finally(() => {
				this.isRunning          = false;
				this.runPromise         = null;
				this.activeCursor       = null;
				this.runAbortController = null;
			});
	}

	private broadcastProgress(): void {
		// Progress delivery is observational UI state; the IPC bridge owns renderer fan-out.
		BUS_AnimeDbUpdateProgress.next(this.getProgress());
	}
}
